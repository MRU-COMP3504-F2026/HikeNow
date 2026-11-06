import type { ChatThread, MessagePart } from "./types";

export function chatName(thread: ChatThread): string {
  return thread.kind === "group" ? thread.name : thread.person.name;
}

export function chatInitials(thread: ChatThread): string {
  if (thread.kind === "direct") return thread.person.initials;
  return thread.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

/** Una mención es "@" + letra + letras, números, "_" o ".". */
const MENTION = /(@[A-Za-z][\w.]*)/g;

/** Divide un texto en trozos normales y menciones. */
export function parseMentions(text: string): MessagePart[] {
  return text
    .split(MENTION)
    .filter(Boolean)
    .map((part) => ({ text: part, mention: part.startsWith("@") && part.length > 1 }));
}

/** Texto corto del último mensaje, para la lista de chats. */
export function previewOf(thread: ChatThread): string {
  const last = thread.messages[thread.messages.length - 1];
  if (!last) return "";
  const prefix = last.from === "me" ? "You: " :
    thread.kind === "group" && last.sender ? `${last.sender.name}: ` : "";
  switch (last.kind) {
    case "trail":
      return `${prefix}Shared a trail: ${last.trail.name}`;
    case "proposal":
      return `${prefix}Hike proposal · ${last.proposal.when}`;
    default:
      return prefix + last.text;
  }
}

const dayFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

/** Próximo sábado a las 9:00 AM, como "Sat, Nov 7 · 9:00 AM". */
export function nextSaturdayLabel(from: Date = new Date()): string {
  const date = new Date(from);
  const daysAhead = (6 - date.getDay() + 7) % 7 || 7;
  date.setDate(date.getDate() + daysAhead);
  return `${dayFormat.format(date)} · 9:00 AM`;
}
