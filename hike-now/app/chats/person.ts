import type { ChatPerson } from "./types";
import { hikerName } from "../lib/hiker-search";

export function chatPerson(person: { id: string; email: string }): ChatPerson {
  const name = hikerName(person.email);
  return {
    id: person.id,
    name,
    handle: `@${person.email.split("@")[0]}`,
    initials: name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
    tone: "forest",
  };
}
