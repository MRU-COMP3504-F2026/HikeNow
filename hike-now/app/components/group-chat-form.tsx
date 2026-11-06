"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { MAX_GROUP_MEMBERS, MAX_GROUP_NAME_LENGTH, MIN_GROUP_MEMBERS } from "../chats/constants";
import type { ChatPerson } from "../chats/types";
import Button from "./button";

type GroupChatFormProps = {
  contacts: ChatPerson[];
  pending: boolean;
  onCreate: (name: string, inviteeIds: string[]) => Promise<boolean>;
  onCancel: () => void;
};

export default function GroupChatForm({ contacts, pending, onCreate, onCancel }: GroupChatFormProps) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Enter a group name.");
      return;
    }
    if (selected.length < MIN_GROUP_MEMBERS - 1 || selected.length > MAX_GROUP_MEMBERS - 1) {
      setError(`Choose between ${MIN_GROUP_MEMBERS - 1} and ${MAX_GROUP_MEMBERS - 1} hikers.`);
      return;
    }
    setError(null);
    await onCreate(name.trim(), selected);
  }

  return (
    <form aria-label="Create group chat" onSubmit={(event) => { void submit(event); }} className="mb-4 rounded-control border border-border-soft bg-surface p-4">
      <h2 className="mb-3 text-heading font-semibold text-primary">Create a group chat</h2>
      <label htmlFor="group-chat-name" className="mb-1 block text-small font-semibold text-text">
        Group name
      </label>
      <input
        id="group-chat-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={MAX_GROUP_NAME_LENGTH}
        disabled={pending}
        className="mb-4 h-11 w-full max-w-md rounded-control border border-field-border bg-background px-3 text-nav text-text focus-visible:outline-2 focus-visible:outline-primary"
      />
      <fieldset disabled={pending}>
        <legend className="text-small font-semibold text-text">Choose hikers you follow</legend>
        <p className="mt-1 text-small text-text-muted">
          Select {MIN_GROUP_MEMBERS - 1}-{MAX_GROUP_MEMBERS - 1} hikers. A group can have up to {MAX_GROUP_MEMBERS} members including you.
        </p>
        {contacts.length < MIN_GROUP_MEMBERS - 1 ? (
          <p className="mt-3 text-small text-text-muted">
            Follow at least two hikers to create a group.{" "}
            <Link href="/search" className="text-primary underline">Find hikers</Link>
          </p>
        ) : (
          <div className="mt-3 flex max-h-52 flex-col gap-2 overflow-y-auto">
            {contacts.map((person) => {
              const checked = selected.includes(person.id);
              return (
                <label key={person.id} className="flex items-center gap-2 text-small text-text">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!checked && selected.length >= MAX_GROUP_MEMBERS - 1}
                    onChange={() => setSelected((current) => checked
                      ? current.filter((id) => id !== person.id)
                      : [...current, person.id])}
                  />
                  <span>{person.name} <span className="text-text-subtle">{person.handle}</span></span>
                </label>
              );
            })}
          </div>
        )}
      </fieldset>
      <p className="mt-2 text-small text-text-subtle">{selected.length + 1} / {MAX_GROUP_MEMBERS} members</p>
      {error && <p role="alert" className="mt-2 text-small text-danger">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="submit" disabled={pending || contacts.length < MIN_GROUP_MEMBERS - 1}>Create group</Button>
        <Button variant="outline" onClick={onCancel} disabled={pending}>Cancel</Button>
      </div>
    </form>
  );
}
