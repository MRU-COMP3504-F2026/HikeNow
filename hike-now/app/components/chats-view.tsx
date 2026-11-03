"use client";

import { useState } from "react";
import { useChats } from "../hooks/use-chats";
import type { ChatPerson, ChatThread, MentionOption, TrailShare } from "../chats/types";
import ChatEmptyState from "./chat-empty-state";
import ChatList from "./chat-list";
import ChatThreadView from "./chat-thread";

export type ChatsViewProps = {
  initialThreads: ChatThread[];
  shareableTrails: TrailShare[];
  mentionOptions: MentionOption[];
  suggestions: { person: ChatPerson; reviewed: string }[];
  /** Usuario actual. */
  me: ChatPerson;
};

/** Pestaña Chats completa: lista de conversaciones + conversación abierta. */
export default function ChatsView({
  initialThreads,
  shareableTrails,
  mentionOptions,
  suggestions,
  me,
}: ChatsViewProps) {
  const chats = useChats({ initialThreads, shareableTrails });
  // En móvil se ve la lista o la conversación, no las dos a la vez.
  const [threadOpenOnMobile, setThreadOpenOnMobile] = useState(false);

  const noChats = chats.threads.length === 0;
  const { active } = chats;

  return (
    <section
      aria-label="Chats"
      className="flex overflow-hidden rounded-control border border-border-soft"
    >
      <ChatList
        className={threadOpenOnMobile ? "hidden md:flex" : "flex"}
        threads={chats.visibleThreads}
        activeId={active?.id ?? null}
        tab={chats.tab}
        requestCount={chats.requestCount}
        search={chats.search}
        noChats={noChats}
        onSearch={chats.setSearch}
        onTab={(tab) => {
          chats.selectTab(tab);
          setThreadOpenOnMobile(false);
        }}
        onSelect={(id) => {
          chats.selectThread(id);
          setThreadOpenOnMobile(true);
        }}
      />

      <div
        className={[
          "h-170 min-w-0 flex-1 flex-col bg-background",
          threadOpenOnMobile ? "flex" : "hidden md:flex",
        ].join(" ")}
      >
        {active ? (
          <ChatThreadView
            thread={active}
            me={me}
            mentionOptions={mentionOptions}
            onBack={() => setThreadOpenOnMobile(false)}
            onToggleFollow={() => chats.toggleFollow(active.id)}
            onAccept={() => chats.accept(active.id)}
            onDecline={() => {
              chats.decline(active.id);
              setThreadOpenOnMobile(false);
            }}
            onSend={chats.sendText}
            onShareTrail={chats.shareTrail}
            onProposeHike={chats.proposeHike}
            onRsvp={chats.rsvp}
          />
        ) : noChats ? (
          <ChatEmptyState suggestions={suggestions} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
            <p className="text-heading font-semibold text-primary">No chat selected</p>
            <p className="text-nav text-text-subtle">Pick a conversation from the list.</p>
          </div>
        )}
      </div>
    </section>
  );
}
