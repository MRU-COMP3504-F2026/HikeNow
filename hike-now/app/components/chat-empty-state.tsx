import Link from "next/link";
import type { ChatPerson } from "../chats/types";
import Avatar from "./avatar";
import FollowButton from "./follow-button";
import { TrailIcon } from "./icons";

export type ChatEmptyStateProps = {
  /** Hikers que reseñaron las mismas rutas, para empezar a seguirlos. */
  suggestions: { person: ChatPerson; reviewed: string }[];
};

const linkButton =
  "inline-flex min-h-11 items-center justify-center rounded-control px-6 text-small font-medium shadow-control transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** Estado vacío: aún no hay conversaciones. */
export default function ChatEmptyState({ suggestions }: ChatEmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-7 overflow-y-auto p-8">
      <div className="flex flex-col items-center gap-3.5 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
          <TrailIcon size={32} />
        </span>
        <h2 className="text-title font-semibold text-primary">Find someone to hike with</h2>
        <p className="max-w-md text-nav leading-normal text-text-muted">
          Ask about a trail, share your reviews or plan your next hike. Follow other hikers to
          start a conversation.
        </p>
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          <Link href="/" className={`${linkButton} bg-primary text-on-primary hover:bg-primary/90`}>
            Browse trails
          </Link>
          <Link href="/reviews" className={`${linkButton} border border-border bg-background text-text hover:bg-surface`}>
            Read reviews
          </Link>
        </div>
      </div>

      {suggestions.length > 0 && (
        <section aria-label="Hikers who reviewed the same trails" className="flex w-full max-w-xl flex-col gap-3">
          <h3 className="text-small font-semibold tracking-wide text-text-subtle">
            HIKERS WHO REVIEWED THE SAME TRAILS
          </h3>
          <ul className="flex flex-col gap-3">
            {suggestions.map(({ person, reviewed }) => (
              <li
                key={person.id}
                className="flex items-center gap-3 rounded-control border border-border-soft px-3.5 py-3"
              >
                <Avatar initials={person.initials} tone={person.tone} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-nav font-medium text-text">{person.name}</span>
                  <span className="text-small text-text-subtle">{reviewed}</span>
                </span>
                <FollowButton name={person.name} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
