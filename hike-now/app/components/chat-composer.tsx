"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { MentionOption } from "../chats/types";
import Avatar from "./avatar";
import Button from "./button";
import { AtSignIcon, CalendarIcon, SendIcon, TrailIcon } from "./icons";

export type ChatComposerProps = {
  /** Personas que se pueden mencionar (gente con la que se hizo una ruta). */
  mentionOptions: MentionOption[];
  onSend: (text: string, messageId: string) => Promise<boolean>;
  draftStorageKey: string;
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
  draftStorageKey,
  onShareTrail,
  onProposeHike,
  actionPending = false,
  className = "",
}: ChatComposerProps) {
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [retryPending, setRetryPending] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const messageId = useRef<string | null>(null);
  const sending = useRef(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(draftStorageKey);
      if (!stored) return;
      const saved: unknown = JSON.parse(stored);
      if (!saved || typeof saved !== "object" || !("text" in saved) || typeof saved.text !== "string" ||
        !("messageId" in saved) || typeof saved.messageId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(saved.messageId)) {
        throw new Error("Invalid saved chat draft.");
      }
      messageId.current = saved.messageId;
      // Browser storage is only available after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(saved.text);
      setRetryPending("attempted" in saved && saved.attempted === true);
    } catch (error) {
      console.error("Could not restore chat draft:", error);
      setDraftError("Could not restore your saved draft. Keep this page open while sending.");
    }
  }, [draftStorageKey]);

  const persist = useCallback((text: string, id: string | null, attempted = false) => {
    try {
      if (text) localStorage.setItem(draftStorageKey, JSON.stringify({ text, messageId: id, attempted }));
      else localStorage.removeItem(draftStorageKey);
      setDraftError(null);
    } catch (error) {
      console.error("Could not preserve chat draft:", error);
      setDraftError("Could not save your draft on this device. Keep this page open until your message is sent.");
    }
  }, [draftStorageKey]);

  function change(value: string) {
    messageId.current = crypto.randomUUID();
    setRetryPending(false);
    setDraft(value);
    persist(value, messageId.current);
    // Escribir "@" al principio o tras un espacio abre la lista de menciones.
    setMentionOpen(/(^|\s)@$/.test(value));
  }

  function pick(option: MentionOption) {
    const first = option.person.name.split(" ")[0];
    change(`${draft.replace(/@$/, "")}@${first} `);
    setMentionOpen(false);
    input.current?.focus();
  }

  const send = useCallback(async () => {
    if (!draft.trim() || actionPending || sending.current) return;
    sending.current = true;
    messageId.current ??= crypto.randomUUID();
    setRetryPending(true);
    persist(draft, messageId.current, true);
    try {
      if (await onSend(draft, messageId.current)) {
        persist("", null);
        messageId.current = null;
        setRetryPending(false);
        setDraft("");
        setMentionOpen(false);
      }
    } finally {
      sending.current = false;
    }
  }, [actionPending, draft, onSend, persist]);

  useEffect(() => {
    if (!retryPending || actionPending) return;
    const retry = () => {
      if (navigator.onLine && document.visibilityState !== "hidden") void send();
    };
    const timer = setInterval(retry, 10000);
    window.addEventListener("online", retry);
    document.addEventListener("visibilitychange", retry);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", retry);
      document.removeEventListener("visibilitychange", retry);
    };
  }, [actionPending, retryPending, send]);

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
      {draftError && <p role="alert" className="mb-2 text-small text-danger">{draftError}</p>}
      {retryPending && !actionPending && (
        <p role="status" className="mb-2 text-small text-text-muted">
          Message not yet confirmed. Retrying automatically when connected. Edit the draft to stop retrying.
        </p>
      )}
      {mentionOpen && (
        <div
          role="dialog"
          aria-label="Mention a hiking partner"
          className="absolute bottom-[calc(100%+8px)] left-4 z-10 w-[min(21rem,calc(100%-2rem))] rounded-control border border-border bg-background p-2 shadow-lg"
        >
          <p className="px-2 pt-1 pb-2 text-small font-semibold tracking-wide text-text-subtle">
            HIKERS
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
          maxLength={4000}
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
