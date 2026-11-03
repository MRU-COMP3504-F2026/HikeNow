"use client";

import type { ChatPerson, ChatThread, MentionOption, Rsvp } from "../chats/types";
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
  onAccept: () => void;
  onDecline: () => void;
  onSend: (text: string) => void;
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
  onAccept,
  onDecline,
  onSend,
  onShareTrail,
  onProposeHike,
  onRsvp,
}: ChatThreadViewProps) {
  const { person } = thread;
  const firstName = person.name.split(" ")[0];

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
        <Avatar initials={person.initials} tone={person.tone} />
        <div className="min-w-0 flex-1 basis-48">
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="text-heading font-semibold text-text">{person.name}</h2>
            <span className="text-small text-text-subtle">{person.handle}</span>
          </div>
          <p className="flex items-center gap-1.5 text-small text-text-muted">
            <TrailIcon size={12} />
            {thread.context}
          </p>
        </div>
        {thread.following ? (
          <Button
            variant="outline"
            aria-pressed="true"
            aria-label={`Unfollow ${person.name}`}
            className="min-h-11 min-w-28"
            onClick={onToggleFollow}
          >
            Following
          </Button>
        ) : (
          <Button
            aria-pressed="false"
            aria-label={`${thread.isRequest ? "Follow back" : "Follow"} ${person.name}`}
            className="min-h-11 min-w-28"
            onClick={onToggleFollow}
          >
            {thread.isRequest ? "Follow back" : "Follow"}
          </Button>
        )}
      </div>

      {/* column-reverse mantiene el scroll abajo cuando llegan mensajes nuevos. */}
      <div className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto">
        <div className="flex flex-col gap-3 p-4 md:p-6">
          <p className="mb-1 text-center text-small text-text-subtle">Today</p>
          {thread.messages.map((message) => (
            <ChatMessageView key={message.id} message={message} me={me} onRsvp={onRsvp} />
          ))}
        </div>
      </div>

      {thread.isRequest ? (
        <div className="flex flex-col items-center gap-2.5 border-t border-border-soft bg-surface px-6 py-5 text-center">
          <p className="text-nav font-semibold text-text">{firstName} wants to message you</p>
          <p className="max-w-md text-small leading-normal text-text-muted">
            You don&apos;t follow each other yet. {firstName} won&apos;t know you&apos;ve read their
            messages until you accept.
          </p>
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            <Button className="min-h-11 min-w-28" onClick={onAccept}>
              Accept
            </Button>
            <Button
              variant="outline"
              className="min-h-11 min-w-28 border-danger text-danger hover:bg-danger/5"
              onClick={onDecline}
            >
              Delete
            </Button>
            <button
              type="button"
              onClick={onDecline}
              className="min-h-11 cursor-pointer px-4 text-small text-text-muted underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-primary"
            >
              Block
            </button>
          </div>
        </div>
      ) : (
        <ChatComposer
          key={thread.id}
          mentionOptions={mentionOptions}
          onSend={onSend}
          onShareTrail={onShareTrail}
          onProposeHike={onProposeHike}
        />
      )}
    </>
  );
}
