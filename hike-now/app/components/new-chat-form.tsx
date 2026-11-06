"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { MAX_GROUP_MEMBERS, MAX_GROUP_NAME_LENGTH } from "../chats/constants";
import type { ChatPerson } from "../chats/types";
import Button from "./button";

type NewChatFormProps = {
  contacts: ChatPerson[];
  pending: boolean;
  error: string | null;
  onCreate: (recipientIds: string[], groupName: string) => Promise<boolean>;
  onCancel: () => void;
};

export default function NewChatForm({ contacts, pending, error, onCreate, onCancel }: NewChatFormProps) {
  const searchInput = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const recipients = contacts.filter((person) => selected.includes(person.id));
  const query = search.trim().toLowerCase();
  const matches = contacts.filter((person) =>
    person.name.toLowerCase().includes(query) || person.handle.toLowerCase().includes(query));
  const defaultGroupName = selected.map((id) => contacts.find((person) => person.id === id)?.name)
    .join(", ").slice(0, MAX_GROUP_NAME_LENGTH);

  useEffect(() => {
    const previousFocus = document.activeElement;
    searchInput.current?.focus();
    function trapFocus(event: KeyboardEvent) {
      if (event.key !== "Tab" || !form.current) return;
      const controls = Array.from(form.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), a[href]'));
      const first = controls[0];
      const last = controls.at(-1);
      if (!first) {
        event.preventDefault();
        form.current.focus();
      } else if (!form.current.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", trapFocus);
    return () => {
      document.removeEventListener("keydown", trapFocus);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!selected.length || selected.length > MAX_GROUP_MEMBERS - 1) {
      setValidationError(`Choose between 1 and ${MAX_GROUP_MEMBERS - 1} hikers.`);
      return;
    }
    setValidationError(null);
    await onCreate(selected, name.trim() || defaultGroupName);
  }

  return (
    <form
      ref={form}
      tabIndex={-1}
      aria-label="Start a new chat"
      onSubmit={(event) => { void submit(event); }}
      className="max-h-[85dvh] overflow-y-auto rounded-control border border-border-soft bg-background p-5 shadow-control"
    >
      <h2 className="mb-3 text-heading font-semibold text-primary">New chat</h2>
      <div className="mb-4">
        <p className="text-small font-semibold text-text">To</p>
        {recipients.length ? (
          <ul aria-label="Selected recipients" className="mt-2 flex flex-wrap gap-2">
            {recipients.map((person) => (
              <li key={person.id} className="flex items-center gap-1 rounded-control bg-surface pl-3 text-small text-text">
                <span>{person.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${person.name}`}
                  disabled={pending}
                  onClick={() => {
                    setSelected((current) => current.filter((id) => id !== person.id));
                    searchInput.current?.focus();
                  }}
                  className="min-h-11 min-w-11 rounded-control text-primary focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="mt-1 text-small text-text-muted">Add hikers using the + buttons below.</p>}
        <p className="mt-2 text-small text-text-subtle">
          {selected.length} / {MAX_GROUP_MEMBERS - 1} recipients (up to {MAX_GROUP_MEMBERS} members including you)
        </p>
      </div>
      <label htmlFor="new-chat-search" className="mb-1 block text-small font-semibold text-text">
        Search hikers you follow
      </label>
      <input
        ref={searchInput}
        id="new-chat-search"
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        disabled={pending}
        placeholder="Search by name or handle"
        className="mb-3 h-11 w-full rounded-control border border-field-border bg-background px-3 text-nav text-text focus-visible:outline-2 focus-visible:outline-primary"
      />
      {!contacts.length ? (
        <p className="mb-4 text-small text-text-muted">
          Follow a hiker to start a chat.{" "}
          <Link href="/search" className="text-primary underline">Find hikers</Link>
        </p>
      ) : !matches.length ? (
        <p role="status" className="mb-4 text-small text-text-muted">No followed hikers match your search.</p>
      ) : (
        <ul aria-label="Followed hikers" className="mb-4 max-h-52 overflow-y-auto">
          {matches.map((person) => {
            const added = selected.includes(person.id);
            return (
              <li key={person.id} className="flex items-center justify-between gap-3 border-b border-border-soft py-2">
                <div className="min-w-0 text-small text-text">
                  <p className="break-words font-semibold">{person.name}</p>
                  <p className="truncate text-text-subtle">{person.handle}</p>
                </div>
                <button
                  type="button"
                  aria-label={added ? `${person.name} added` : `Add ${person.name}`}
                  disabled={pending || added || selected.length >= MAX_GROUP_MEMBERS - 1}
                  onClick={() => {
                    setValidationError(null);
                    setSelected((current) => current.includes(person.id) || current.length >= MAX_GROUP_MEMBERS - 1
                      ? current : [...current, person.id]);
                    searchInput.current?.focus();
                  }}
                  className="min-h-11 min-w-11 shrink-0 rounded-control border border-border-soft text-primary focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
                >
                  {added ? <span className="text-small">Added</span> : <span aria-hidden="true">+</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {selected.length > 1 && (
        <div className="mb-4">
          <label htmlFor="new-chat-name" className="mb-1 block text-small font-semibold text-text">
            Group name (optional)
          </label>
          <input
            id="new-chat-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={MAX_GROUP_NAME_LENGTH}
            placeholder={defaultGroupName}
            disabled={pending}
            className="h-11 w-full rounded-control border border-field-border bg-background px-3 text-nav text-text focus-visible:outline-2 focus-visible:outline-primary"
          />
        </div>
      )}
      {(validationError || error) && <p role="alert" className="mb-3 text-small text-danger">{validationError ?? error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending || !selected.length}>{pending ? "Starting..." : "Start chat"}</Button>
        <Button variant="outline" onClick={onCancel} disabled={pending}>Cancel</Button>
      </div>
    </form>
  );
}
