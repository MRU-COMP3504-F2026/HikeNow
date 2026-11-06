"use client";

import { useState } from "react";
import { useChats } from "../hooks/use-chats";
import { useAuthenticatedAction } from "../hooks/use-authenticated-action";
import type { ChatPerson, ChatThread, MentionOption, TrailShare } from "../chats/types";
import ChatEmptyState from "./chat-empty-state";
import ChatList from "./chat-list";
import ChatThreadView from "./chat-thread";
import NewChatForm from "./new-chat-form";
import Modal from "./modal";
import Button from "./button";

export type ChatsViewProps = {
  initialThreads: ChatThread[];
  shareableTrails: TrailShare[];
  mentionOptions: MentionOption[];
  suggestions: { person: ChatPerson; reviewed: string }[];
  /** Usuario actual. */
  me: ChatPerson;
  initialThreadId?: string;
  contacts?: ChatPerson[];
};

/** Pestaña Chats completa: lista de conversaciones + conversación abierta. */
export default function ChatsView({
  initialThreads,
  shareableTrails,
  mentionOptions,
  suggestions,
  me,
  initialThreadId,
  contacts = [],
}: ChatsViewProps) {
  const chats = useChats({ initialThreads, initialThreadId, shareableTrails, userId: me.id });
  const actionAuth = useAuthenticatedAction();
  // En móvil se ve la lista o la conversación, no las dos a la vez.
  const [threadOpenOnMobile, setThreadOpenOnMobile] = useState(Boolean(initialThreadId));
  const [creatingChat, setCreatingChat] = useState(false);

  const noChats = chats.threads.length === 0;
  const { active } = chats;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button
          variant="outline"
          aria-expanded={creatingChat}
          aria-haspopup="dialog"
          disabled={actionAuth.pending}
          onClick={() => setCreatingChat(true)}
        >
          New chat
        </Button>
      </div>
      <Modal open={creatingChat} label="New chat" onClose={() => {
        if (!actionAuth.pending) setCreatingChat(false);
      }}>
        {creatingChat && <NewChatForm
          contacts={contacts}
          pending={actionAuth.pending}
          error={actionAuth.error}
          onCancel={() => setCreatingChat(false)}
          onCreate={(recipientIds, name) => actionAuth.run(async () => {
            if (recipientIds.length === 1) await chats.start(recipientIds[0]);
            else await chats.createGroup(name, recipientIds);
            setCreatingChat(false);
            setThreadOpenOnMobile(true);
          })}
        />}
      </Modal>
      {((!creatingChat && actionAuth.error) || chats.refreshError) && (
        <p role="alert" className="mb-3 text-small text-danger">{(!creatingChat && actionAuth.error) || chats.refreshError}</p>
      )}
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
          void actionAuth.run(() => chats.selectThread(id));
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
            key={active.id}
            thread={active}
            me={me}
            mentionOptions={active.kind === "group"
              ? active.members.filter((person) => person.id !== me.id).map((person) => ({ person, trail: "Group member" }))
              : mentionOptions}
            onBack={() => setThreadOpenOnMobile(false)}
            onToggleFollow={() => { void actionAuth.run(() => chats.toggleFollow(active.id)); }}
            actionPending={actionAuth.pending}
            onAccept={() => { void actionAuth.run(() => chats.accept(active.id)); }}
            onDecline={() => {
              void actionAuth.run(async () => {
                await chats.decline(active.id);
                setThreadOpenOnMobile(false);
              });
            }}
            onBlock={() => { void actionAuth.run(async () => {
              await chats.decline(active.id, true);
              setThreadOpenOnMobile(false);
            }); }}
            onLeave={() => { void actionAuth.run(async () => {
              await chats.decline(active.id, true);
              setThreadOpenOnMobile(false);
            }); }}
            onSend={(text) => actionAuth.run(() => chats.sendText(text))}
            onShareTrail={() => { void actionAuth.run(chats.shareTrail); }}
            onProposeHike={() => { void actionAuth.run(chats.proposeHike); }}
            onRsvp={(messageId, value) => { void actionAuth.run(() => chats.rsvp(messageId, value)); }}
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
    </div>
  );
}
