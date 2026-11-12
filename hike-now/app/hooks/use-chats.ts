"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, ChatTab, ChatThread, Rsvp, SendChatInput } from "../chats/types";
import { createGroupConversation, getChatThreads, markChatRead, respondToProposal, sendChatMessage, startConversation, updateChatRequest } from "../actions/chats";
import { followUser, unfollowUser } from "../actions/follows";
import { chatName } from "../chats/utils";

export type UseChatsOptions = {
  initialThreads: ChatThread[];
  initialThreadId?: string;
  userId: string;
};

export function useChats({ initialThreads, initialThreadId, userId }: UseChatsOptions) {
  const [threads, setThreads] = useState(initialThreads);
  const [tab, setTab] = useState<ChatTab>(
    () => initialThreads.find((thread) => thread.id === initialThreadId)?.isRequest ? "requests" : "messages",
  );
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(
    () => initialThreadId ?? initialThreads.find((thread) => !thread.isRequest)?.id ?? null,
  );
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const refreshVersion = useRef(0);
  const confirmedMessages = useRef(new Map<string, ChatMessage[]>());
  const reconcile = useCallback((next: ChatThread[], previous: ChatThread[]) => {
    const merged = next.map((thread) => {
      const confirmed = confirmedMessages.current.get(thread.id) ?? [];
      const missing = confirmed.filter((saved) => !thread.messages.some((message) => message.id === saved.id));
      return missing.length ? {
        ...thread, isRequest: false, time: "now", messages: [...thread.messages, ...missing],
      } : thread;
    });
    return [...merged, ...previous.filter((thread) =>
      confirmedMessages.current.has(thread.id) && !next.some((item) => item.id === thread.id))];
  }, []);
  const [previousInitial, setPreviousInitial] = useState(initialThreads);
  if (initialThreads !== previousInitial) {
    setPreviousInitial(initialThreads);
    setThreads((previous) => reconcile(initialThreads, previous));
  }

  const refresh = useCallback(async () => {
    const version = ++refreshVersion.current;
    const next = await getChatThreads();
    if (version === refreshVersion.current) {
      setThreads((previous) => reconcile(next, previous));
      setRefreshError(null);
    }
  }, [reconcile]);

  useEffect(() => {
    let disposed = false;
    let refreshing = false;
    const update = async () => {
      if (disposed || refreshing || document.visibilityState === "hidden") return;
      refreshing = true;
      try {
        await refresh();
      } catch (error) {
        if (!disposed) {
          console.error("Could not refresh chats:", error);
          setRefreshError("Could not refresh chats. Please reload or try again.");
        }
      } finally {
        refreshing = false;
      }
    };
    const timer = setInterval(() => { void update(); }, 10000);
    window.addEventListener("online", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      disposed = true;
      clearInterval(timer);
      window.removeEventListener("online", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [refresh]);

  const requestCount = threads.filter((thread) => thread.isRequest).length;
  const inTab = threads.filter((thread) => thread.isRequest === (tab === "requests"));
  const query = search.trim().toLowerCase();
  const visibleThreads = inTab.filter((thread) => !query || chatName(thread).toLowerCase().includes(query));
  const active = inTab.find((thread) => thread.id === activeId) ?? inTab[0] ?? null;
  const readableId = active && !active.isRequest && !active.blocked && active.unread ? active.id : null;

  useEffect(() => {
    if (!readableId) return;
    let disposed = false;
    void (async () => {
      try {
        await markChatRead(readableId);
        if (!disposed) await refresh();
      } catch (error) {
        if (!disposed) {
          console.error("Could not mark chat as read:", error);
          setRefreshError("Could not update the conversation. Please try again.");
        }
      }
    })();
    return () => { disposed = true; };
  }, [readableId, refresh]);

  const selectTab = (next: ChatTab) => {
    setTab(next);
    setActiveId(threads.find((thread) => thread.isRequest === (next === "requests"))?.id ?? null);
  };

  const selectThread = async (id: string) => {
    setActiveId(id);
    const thread = threads.find((item) => item.id === id);
    if (thread && !thread.isRequest && !thread.blocked) {
      await markChatRead(id);
      await refresh();
    }
  };

  const toggleFollow = async (id: string) => {
    const thread = threads.find((item) => item.id === id);
    if (!thread || thread.kind !== "direct") throw new Error("Direct conversation not found.");
    if (thread.following) await unfollowUser(userId, thread.person.id);
    else await followUser(userId, thread.person.id);
    await refresh();
  };

  const accept = async (id: string) => {
    await updateChatRequest(id, "accept");
    ++refreshVersion.current;
    setThreads((all) => all.map((thread) => thread.id === id
      ? { ...thread, isRequest: false, unread: false }
      : thread));
    setTab("messages");
    setActiveId(id);
  };

  const decline = async (id: string, block = false) => {
    await updateChatRequest(id, block ? "block" : "delete");
    ++refreshVersion.current;
    confirmedMessages.current.delete(id);
    setThreads((all) => all.filter((thread) => thread.id !== id));
    setActiveId((current) => current === id ? null : current);
  };

  const send = async (input: SendChatInput, messageId = crypto.randomUUID()) => {
    if (!active) throw new Error("Select a conversation first.");
    let saved: ChatMessage;
    for (let attempt = 0; ; attempt++) {
      try {
        saved = await sendChatMessage(active.id, input, messageId);
        break;
      } catch (error) {
        if (attempt === 2) throw error;
        console.error("Chat delivery failed; retrying with the same message ID:", error);
        await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 500 : 1500));
      }
    }
    const confirmed = confirmedMessages.current.get(active.id) ?? [];
    if (!confirmed.some((message) => message.id === saved.id)) {
      confirmedMessages.current.set(active.id, [...confirmed, saved]);
    }
    ++refreshVersion.current;
    setThreads((all) => {
      const current = all.some((thread) => thread.id === active.id) ? all : [...all, active];
      return current.map((thread) => thread.id === active.id ? {
        ...thread,
        isRequest: false,
        unread: false,
        time: "now",
        messages: thread.messages.some((message) => message.id === saved.id)
          ? thread.messages : [...thread.messages, saved],
      } : thread);
    });
  };

  const start = async (personId: string) => {
    const id = await startConversation(personId);
    await refresh();
    setSearch("");
    setTab("messages");
    setActiveId(id);
  };

  const createGroup = async (name: string, inviteeIds: string[]) => {
    const group = await createGroupConversation(name, inviteeIds);
    ++refreshVersion.current;
    setThreads((all) => [group, ...all.filter((thread) => thread.id !== group.id)]);
    setSearch("");
    setTab("messages");
    setActiveId(group.id);
  };

  const rsvp = async (messageId: string, value: Rsvp) => {
    if (!active) throw new Error("Select a conversation first.");
    await respondToProposal(active.id, messageId, value);
    await refresh();
  };

  return {
    threads, visibleThreads, active, tab, search, requestCount, refreshError,
    setSearch, selectTab, selectThread, toggleFollow, accept, decline, start, createGroup, rsvp,
    sendText: (text: string, messageId?: string) => send({ kind: "text", text }, messageId),
    shareTrail: (trailId: string) => send({ kind: "trail", trailId }),
    proposeHike: (trailId: string) => send({ kind: "proposal", trailId }),
  };
}
