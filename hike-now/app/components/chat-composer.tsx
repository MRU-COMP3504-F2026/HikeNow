"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { MentionOption } from "../chats/types";
import Avatar from "./avatar";
import Button from "./button";
import { AtSignIcon, CalendarIcon, SendIcon, TrailIcon } from "./icons";

export type ChatComposerProps = {
  /** Personas que se pueden mencionar (gente con la que se hizo una ruta). */
  mentionOptions: MentionOption[];
  onSend: (text: string) => Promise<boolean>;
  onShareTrail: () => void;
  onProposeHike: () => void;
  actionPending?: boolean;
  className?: string;
};

function ToolButton({
  label,
  onClick,
  active,
  children,
  expanded,
  disabled,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  expanded?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={expanded}
      onClick={onClick}
      disabled={disabled}
      className={[
        "grid size-11 shrink-0 cursor-pointer place-items-center rounded-control border text-primary transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        active ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-surface",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/** Barra para escribir: menciones (@), compartir ruta, proponer salida y enviar. */
export default function ChatComposer({
  mentionOptions,
  onSend,
  onShareTrail,
  onProposeHike,
  actionPending = false,
  className = "",
}: ChatComposerProps) {
  const [draft, setDraft] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  function change(value: string) {
    setDraft(value);
    // Escribir "@" al principio o tras un espacio abre la lista de menciones.
    setMentionOpen(/(^|\s)@$/.test(value));
  }

  function pick(option: MentionOption) {
    const first = option.person.name.split(" ")[0];
    setDraft((d) => `${d.replace(/@$/, "")}@${first} `);
    setMentionOpen(false);
    input.current?.focus();
  }

  async function send() {
    if (!draft.trim() || actionPending) return;
    if (await onSend(draft)) {
      setDraft("");
      setMentionOpen(false);
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div
      className={["relative border-t border-border-soft px-4 py-3", className].join(" ")}
      onKeyDown={(e) => e.key === "Escape" && setMentionOpen(false)}
    >
      {mentionOpen && (
        <div
          role="dialog"
          aria-label="Mention a hiking partner"
          className="absolute bottom-[calc(100%+8px)] left-4 z-10 w-[min(21rem,calc(100%-2rem))] rounded-control border border-border bg-background p-2 shadow-lg"
        >
          <p className="px-2 pt-1 pb-2 text-small font-semibold tracking-wide text-text-subtle">
            PEOPLE YOU HIKED WITH
          </p>
          {mentionOptions.map((option) => (
            <button
              key={option.person.id}
              type="button"
              onClick={() => pick(option)}
              className="flex min-h-13 w-full cursor-pointer items-center gap-3 rounded-control px-2 py-1.5 text-left hover:bg-surface focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Avatar initials={option.person.initials} tone={option.person.tone} size={36} />
              <span className="flex flex-col">
                <span className="text-nav font-medium text-text">{option.person.name}</span>
                <span className="text-small text-text-subtle">{option.trail}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <ToolButton
          label="Mention a hiking partner"
          expanded={mentionOpen}
          active={mentionOpen}
          onClick={() => setMentionOpen((open) => !open)}
          disabled={actionPending}
        >
          <AtSignIcon size={18} />
        </ToolButton>
        <ToolButton label="Share a trail" onClick={onShareTrail} disabled={actionPending}>
          <TrailIcon size={18} />
        </ToolButton>
        <ToolButton label="Propose a hike" onClick={onProposeHike} disabled={actionPending}>
          <CalendarIcon size={18} />
        </ToolButton>
        <input
          ref={input}
          type="text"
          value={draft}
          onChange={(e) => change(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Write a message, type @ to mention"
          aria-label="Message"
          disabled={actionPending}
          className="h-11 min-w-0 flex-1 rounded-control border border-field-border bg-background px-3.5 text-nav text-text placeholder:text-text-subtle focus-visible:outline-2 focus-visible:outline-primary"
        />
        <Button className="min-h-11" aria-label="Send message" onClick={() => { void send(); }} disabled={actionPending}>
          <SendIcon size={16} />
          <span className="hidden sm:inline">Send</span>
        </Button>
      </div>
    </div>
  );
}
