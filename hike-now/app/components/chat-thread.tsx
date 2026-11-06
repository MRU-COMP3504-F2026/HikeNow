"use client";

import { useState } from "react";
import Link from "next/link";
import type { ChatPerson, ChatThread, MentionOption, Rsvp } from "../chats/types";
import { chatInitials, chatName } from "../chats/utils";
import Avatar from "./avatar";
import Button from "./button";
import ChatComposer from "./chat-composer";
import ChatMessageView from "./chat-message";
import { ChevronLeftIcon, TrailIcon } from "./icons";

export type ChatThreadViewProps = {
  thread: ChatThread;
  me: ChatPerson;
  mentionOptions: MentionOption[];
  /** Solo móvil: vuelve a la lista de chats. */
  onBack: () => void;
  onToggleFollow: () => void;
  actionPending?: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onBlock?: () => void;
  onLeave?: () => void;
  onSend: (text: string) => Promise<boolean>;
  onShareTrail: () => void;
  onProposeHike: () => void;
  onRsvp: (messageId: string, value: Rsvp) => void;
};

/** Columna derecha: cabecera, mensajes y, según el caso, banner de solicitud o barra para escribir. */
export default function ChatThreadView({
  thread,
  me,
  mentionOptions,
  onBack,
  onToggleFollow,
  actionPending = false,
  onAccept,
  onDecline,
  onBlock,
  onLeave,
  onSend,
  onShareTrail,
  onProposeHike,
  onRsvp,
}: ChatThreadViewProps) {
  const [confirmLeave, setConfirmLeave] = useState(false);
  const group = thread.kind === "group";
  const firstName = thread.kind === "direct" ? thread.person.name.split(" ")[0] : "";
  const name = chatName(thread);

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-border-soft px-4 py-3.5 md:px-6">
        <button
          type="button"
          aria-label="Back to chats"
          onClick={onBack}
          className="grid size-11 cursor-pointer place-items-center rounded-control text-primary focus-visible:outline-2 focus-visible:outline-primary md:hidden"
        >
          <ChevronLeftIcon size={24} />
        </button>
        <Avatar initials={chatInitials(thread)} tone={thread.kind === "group" ? "moss" : thread.person.tone} />
        <div className="min-w-0 flex-1 basis-48">
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="text-heading font-semibold text-text">{name}</h2>
            {thread.kind === "direct" && <span className="text-small text-text-subtle">{thread.person.handle}</span>}
          </div>
          <p className="flex items-center gap-1.5 text-small text-text-muted">
            <TrailIcon size={12} />
            {thread.context}
          </p>
          {thread.kind === "group" && (
            <details className="mt-1 text-small text-text-muted">
              <summary className="cursor-pointer">View members</summary>
              <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {thread.members.map((person) => (
                  <li key={person.id}>
                    <Link href={`/profile/${person.id}`} className="text-primary underline">{person.name}</Link>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
        {thread.kind === "direct" && (thread.following ? (
          <Button
            variant="outline"
            aria-pressed="true"
            aria-label={`Unfollow ${thread.person.name}`}
            className="min-h-11 min-w-28"
            onClick={onToggleFollow}
            disabled={actionPending}
          >
            Following
          </Button>
        ) : (
          <Button
            aria-pressed="false"
            aria-label={`${thread.isRequest ? "Follow back" : "Follow"} ${thread.person.name}`}
            className="min-h-11 min-w-28"
            onClick={onToggleFollow}
            disabled={actionPending}
          >
            {thread.isRequest ? "Follow back" : "Follow"}
          </Button>
        ))}
        {group && !thread.isRequest && !confirmLeave && (
          <Button variant="outline" onClick={() => setConfirmLeave(true)} disabled={actionPending}>
            Leave group
          </Button>
        )}
        {group && !thread.isRequest && confirmLeave && (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirm leaving group">
            <span className="text-small text-text-muted">Leave this group?</span>
            <Button variant="danger" onClick={onLeave} disabled={actionPending}>Confirm leave</Button>
            <Button variant="outline" onClick={() => setConfirmLeave(false)} disabled={actionPending}>Cancel</Button>
          </div>
        )}
      </div>

      {/* column-reverse mantiene el scroll abajo cuando llegan mensajes nuevos. */}
      <div className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto">
        <div className="flex flex-col gap-3 p-4 md:p-6">
          {thread.messages.map((message) => (
            <ChatMessageView key={message.id} message={message} me={me} onRsvp={onRsvp} actionPending={actionPending} showSender={group} />
          ))}
        </div>
      </div>

      {thread.blocked ? (
        <p role="status" className="border-t border-border-soft p-5 text-center text-text-muted">
          This conversation is blocked. You cannot send further messages.
        </p>
      ) : thread.isRequest ? (
        <div className="flex flex-col items-center gap-2.5 border-t border-border-soft bg-surface px-6 py-5 text-center">
          <p className="text-nav font-semibold text-text">
            {thread.kind === "group" ? `${thread.creator?.name ?? "A hiker"} invited you to this group` : `${firstName} wants to message you`}
          </p>
          <p className="max-w-md text-small leading-normal text-text-muted">
            {thread.kind === "group"
              ? "Accept this invitation to join the conversation, or decline to leave the group."
              : `You don't follow ${firstName} yet. Accept this request to reply, or follow them back.`}
          </p>
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            <Button className="min-h-11 min-w-28" onClick={onAccept} disabled={actionPending}>
              Accept
            </Button>
            <Button
              variant="outline"
              className="min-h-11 min-w-28 border-danger text-danger hover:bg-danger/5"
              onClick={onDecline}
              disabled={actionPending}
            >
              {group ? "Decline" : "Delete"}
            </Button>
            {!group && (
            <button
              type="button"
              onClick={onBlock}
              disabled={actionPending}
              className="min-h-11 cursor-pointer px-4 text-small text-text-muted underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-primary"
            >
              Block
            </button>
            )}
          </div>
        </div>
      ) : (
        <ChatComposer
          key={thread.id}
          mentionOptions={mentionOptions}
          onSend={onSend}
          onShareTrail={onShareTrail}
          onProposeHike={onProposeHike}
          actionPending={actionPending}
        />
      )}
    </>
  );
}
