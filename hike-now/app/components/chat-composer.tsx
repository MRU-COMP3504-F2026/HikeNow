"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { createPortal } from "react-dom";
import type { MentionOption, TrailShare } from "../chats/types";
import Avatar from "./avatar";
import Button from "./button";
import { AtSignIcon, CalendarIcon, SendIcon, TrailIcon } from "./icons";

export type ChatComposerProps = {
  /** Other participants in the current conversation. */
  mentionOptions: MentionOption[];
  shareableTrails: TrailShare[];
  onSend: (text: string, messageId: string) => Promise<boolean>;
  draftStorageKey: string;
  onShareTrail: (trailId: string) => void;
  onProposeHike: (trailId: string) => void;
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
  ref,
  controls,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  expanded?: boolean;
  disabled?: boolean;
  ref?: Ref<HTMLButtonElement>;
  controls?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      ref={ref}
      aria-label={label}
      aria-expanded={expanded}
      aria-controls={controls}
      aria-haspopup={controls ? "dialog" : undefined}
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
  shareableTrails,
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
  const [hikePicker, setHikePicker] = useState<"trail" | "proposal" | null>(null);
  const [hikeSearch, setHikeSearch] = useState("");
  const pickerId = useId();
  const picker = useRef<HTMLDivElement>(null);
  const pickerPointer = useRef<HTMLSpanElement>(null);
  const hikeSearchInput = useRef<HTMLInputElement>(null);
  const shareButton = useRef<HTMLButtonElement>(null);
  const proposalButton = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const messageId = useRef<string | null>(null);
  const sending = useRef(false);
  const query = hikeSearch.trim().toLowerCase();
  const matchingTrails = shareableTrails.filter((trail) =>
    `${trail.name} ${trail.location}`.toLowerCase().includes(query));
  function closeHikePicker(restoreFocus = false) {
    if (restoreFocus) {
      (hikePicker === "trail" ? shareButton : proposalButton).current?.focus({ preventScroll: true });
    }
    setHikePicker(null);
  }

  function toggleHikePicker(kind: "trail" | "proposal") {
    setMentionOpen(false);
    setHikeSearch("");
    setHikePicker((open) => open === kind ? null : kind);
  }

  useLayoutEffect(() => {
    if (!hikePicker) return;
    const positionPicker = () => {
      const panel = picker.current;
      const anchor = (hikePicker === "trail" ? shareButton : proposalButton).current;
      if (!panel || !anchor) return;
      const rect = anchor.getBoundingClientRect();
      const width = Math.min(336, window.innerWidth - 32);
      const left = Math.max(16, Math.min(rect.left, window.innerWidth - width - 16));
      const above = Math.max(0, rect.top - 24);
      const below = Math.max(0, window.innerHeight - rect.bottom - 24);
      const opensAbove = above >= Math.min(panel.scrollHeight, 352) || above >= below;
      Object.assign(panel.style, {
        width: `${width}px`,
        left: `${left}px`,
        top: opensAbove ? "auto" : `${rect.bottom + 8}px`,
        bottom: opensAbove ? `${window.innerHeight - rect.top + 8}px` : "auto",
        maxHeight: `${opensAbove ? above : below}px`,
      });
      if (pickerPointer.current) {
        Object.assign(pickerPointer.current.style, {
          left: `${Math.max(12, Math.min(rect.left + rect.width / 2 - left - 6, width - 24))}px`,
          top: opensAbove ? "auto" : "-6px",
          bottom: opensAbove ? "-6px" : "auto",
          transform: opensAbove ? "rotate(45deg)" : "rotate(225deg)",
        });
      }
    };
    positionPicker();
    window.addEventListener("resize", positionPicker);
    window.addEventListener("scroll", positionPicker, true);
    return () => {
      window.removeEventListener("resize", positionPicker);
      window.removeEventListener("scroll", positionPicker, true);
    };
  }, [hikePicker, hikeSearch, shareableTrails]);

  useEffect(() => {
    if (!hikePicker) return;
    hikeSearchInput.current?.focus({ preventScroll: true });
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !picker.current?.contains(event.target) &&
        !shareButton.current?.contains(event.target) && !proposalButton.current?.contains(event.target)) {
        setHikePicker(null);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [hikePicker]);

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
    setHikePicker(null);
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
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setMentionOpen(false);
          if (hikePicker) {
            e.preventDefault();
            closeHikePicker(true);
          }
        }
      }}
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
      {hikePicker && createPortal(
        <div
          ref={picker}
          id={pickerId}
          role="dialog"
          aria-label={hikePicker === "trail" ? "Share a trail" : "Propose a hike"}
          onBlur={(event) => {
            // Safari can blur to no target before a hike button receives its click.
            if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget) &&
              event.relatedTarget !== shareButton.current && event.relatedTarget !== proposalButton.current) {
              closeHikePicker();
            }
          }}
          className="fixed z-50 flex flex-col rounded-control border border-border bg-background p-3 shadow-lg"
        >
          <span
            aria-hidden="true"
            ref={pickerPointer}
            className="absolute size-3 border-r border-b border-border bg-background"
          />
          <h3 className="mb-2 shrink-0 text-nav font-semibold text-text">
            {hikePicker === "trail" ? "Share a trail" : "Propose a hike"}
          </h3>
          <input
            ref={hikeSearchInput}
            type="search"
            aria-label="Search hikes"
            placeholder="Search hikes by name or location"
            value={hikeSearch}
            onChange={(event) => setHikeSearch(event.target.value)}
            disabled={actionPending}
            className="h-11 w-full shrink-0 rounded-control border border-field-border px-3 text-nav text-text focus-visible:outline-2 focus-visible:outline-primary"
          />
          <ul aria-label="Hikes" className="mt-2 min-h-0 max-h-60 overflow-y-auto">
            {matchingTrails.map((trail) => (
              <li key={trail.id}>
                <button
                  type="button"
                  disabled={actionPending}
                  onClick={() => {
                    closeHikePicker(true);
                    if (hikePicker === "trail") onShareTrail(trail.id);
                    else onProposeHike(trail.id);
                  }}
                  className="flex min-h-13 w-full cursor-pointer flex-col rounded-control px-2 py-2 text-left hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                >
                  <span className="text-nav font-medium text-text">{trail.name}</span>
                  <span className="text-small text-text-subtle">{trail.location}</span>
                </button>
              </li>
            ))}
          </ul>
          {matchingTrails.length === 0 && (
            <p role="status" className="px-2 py-3 text-small text-text-muted">
              {shareableTrails.length ? "No hikes match your search." : "No hikes are available to share or propose."}
            </p>
          )}
        </div>,
        document.body,
      )}

      <div className="flex items-center gap-2">
        <ToolButton
          label="Mention a hiking partner"
          expanded={mentionOpen}
          active={mentionOpen}
          onClick={() => {
            setHikePicker(null);
            setMentionOpen((open) => !open);
          }}
          disabled={actionPending}
        >
          <AtSignIcon size={18} />
        </ToolButton>
        <ToolButton
          ref={shareButton}
          label="Share a trail"
          controls={pickerId}
          expanded={hikePicker === "trail"}
          active={hikePicker === "trail"}
          onClick={() => toggleHikePicker("trail")}
          disabled={actionPending}
        >
          <TrailIcon size={18} />
        </ToolButton>
        <ToolButton
          ref={proposalButton}
          label="Propose a hike"
          controls={pickerId}
          expanded={hikePicker === "proposal"}
          active={hikePicker === "proposal"}
          onClick={() => toggleHikePicker("proposal")}
          disabled={actionPending}
        >
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
