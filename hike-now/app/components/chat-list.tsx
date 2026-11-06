"use client";

import { chatInitials, chatName, previewOf } from "../chats/utils";
import type { ChatTab, ChatThread } from "../chats/types";
import Avatar from "./avatar";
import { MessageIcon, SearchIcon } from "./icons";

export type ChatListProps = {
  /** Conversaciones de la pestaña actual (ya filtradas por la búsqueda). */
  threads: ChatThread[];
  activeId: string | null;
  tab: ChatTab;
  /** Número de solicitudes de mensaje pendientes (insignia de la pestaña). */
  requestCount: number;
  search: string;
  /** true si no hay ninguna conversación en ninguna pestaña. */
  noChats: boolean;
  onSearch: (value: string) => void;
  onSelect: (id: string) => void;
  onTab: (tab: ChatTab) => void;
  className?: string;
};

const tabs: { id: ChatTab; label: string }[] = [
  { id: "messages", label: "Messages" },
  { id: "requests", label: "Requests" },
];

/** Columna izquierda: pestañas Messages/Requests, buscador y lista de conversaciones. */
export default function ChatList({
  threads,
  activeId,
  tab,
  requestCount,
  search,
  noChats,
  onSearch,
  onSelect,
  onTab,
  className = "",
}: ChatListProps) {
  const emptyText = search.trim()
    ? "No chats match your search."
    : tab === "requests"
      ? "No message requests."
      : "No messages yet.";

  return (
    <aside
      aria-label="Conversations"
      className={["h-170 min-h-0 w-full flex-col border-border-soft md:w-85 md:border-r lg:w-95", className].join(" ")}
    >
      <div role="tablist" aria-label="Chat folders" className="grid grid-cols-2 border-b border-border">
        {tabs.map(({ id, label }) => {
          const selected = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onTab(id)}
              className={[
                "-mb-px flex min-h-12 cursor-pointer items-center justify-center gap-2 border-b-2 px-4 text-nav font-medium transition-colors",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
                selected
                  ? "border-primary text-primary"
                  : "border-transparent text-text-subtle hover:text-text",
              ].join(" ")}
            >
              {label}
              {id === "requests" && requestCount > 0 && (
                <span
                  aria-label={`${requestCount} pending`}
                  className="h-5 min-w-5 rounded-full bg-primary px-1.5 text-center text-small leading-5 font-semibold text-on-primary"
                >
                  {requestCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {noChats ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
            <MessageIcon size={24} />
          </span>
          <p className="text-heading font-semibold text-text">No chats yet</p>
          <p className="max-w-64 text-small leading-normal text-text-muted">
            Your conversations with other hikers will show up here.
          </p>
        </div>
      ) : (
        <>
          <div className="px-4 py-3">
            <label className="flex h-10 items-center gap-2 rounded-control border border-field-border px-3 text-text-subtle focus-within:outline-2 focus-within:outline-primary">
              <SearchIcon size={14} />
              <input
                type="search"
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Search chats"
                aria-label="Search chats"
                className="min-w-0 flex-1 bg-transparent text-nav text-text outline-none placeholder:text-text-subtle"
              />
            </label>
          </div>

          <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto">
            {threads.length === 0 ? (
              <p className="px-6 py-8 text-center text-nav text-text-subtle">{emptyText}</p>
            ) : (
              <ul>
                {threads.map((thread) => {
                  const active = thread.id === activeId;
                  return (
                    <li key={thread.id}>
                      <button
                        type="button"
                        aria-current={active ? "true" : undefined}
                        onClick={() => onSelect(thread.id)}
                        className={[
                          "flex min-h-18 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors",
                          "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
                          active ? "bg-primary/10" : "hover:bg-surface",
                        ].join(" ")}
                      >
                        <Avatar initials={chatInitials(thread)} tone={thread.kind === "group" ? "moss" : thread.person.tone} />
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="flex justify-between gap-2">
                            <span className={["text-nav text-text", thread.unread ? "font-bold" : "font-medium"].join(" ")}>
                              {chatName(thread)}
                            </span>
                            <span className="text-small text-text-subtle">{thread.time}</span>
                          </span>
                          <span
                            className={[
                              "truncate text-small",
                              thread.unread ? "font-semibold text-text" : "text-text-subtle",
                            ].join(" ")}
                          >
                            {previewOf(thread)}
                          </span>
                        </span>
                        {thread.unread && (
                          <span aria-label="Unread" className="size-2.5 shrink-0 rounded-full bg-primary" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
