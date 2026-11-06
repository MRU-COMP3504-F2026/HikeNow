"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/actions/profile";
import { MAX_BIO_LENGTH, MAX_DISPLAY_NAME_LENGTH, type ProfileDetails } from "@/app/lib/profile";

type EditProfileProps = {
  /** Nombre derivado del email, usado cuando el hiker no ha elegido uno. */
  defaultName: string;
  initialProfile: ProfileDetails;
  className?: string;
};

export default function EditProfile({ defaultName, initialProfile, className = "" }: EditProfileProps) {
  const router = useRouter();
  const id = useId();
  const [profile, setProfile] = useState(initialProfile);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialProfile.displayName ?? "");
  const [bio, setBio] = useState(initialProfile.bio ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function open() {
    setName(profile.displayName ?? "");
    setBio(profile.bio ?? "");
    setError(null);
    setSaved(false);
    setEditing(true);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateProfile(name, bio);
        if (!result.success) {
          setError(result.error);
          return;
        }
        setProfile(result.profile);
        setEditing(false);
        setSaved(true);
        router.refresh();
      } catch {
        setError("Could not save your profile. Please try again later.");
      }
    });
  }

  return (
    <section aria-label="Edit profile" className={className}>
      {editing ? (
        <form onSubmit={submit} className="flex max-w-xl flex-col gap-4 rounded-control border border-border p-6">
          <h2 className="text-heading font-semibold text-ink">Edit profile</h2>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-name`} className="text-small font-medium text-ink">Name</label>
            <input
              id={`${id}-name`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={MAX_DISPLAY_NAME_LENGTH}
              placeholder={defaultName}
              autoComplete="name"
              disabled={pending}
              aria-describedby={`${id}-name-help`}
              className="rounded-control border border-field-border px-3 py-2"
            />
            <p id={`${id}-name-help`} className="text-small text-text-subtle">
              Leave blank to use {defaultName}.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-bio`} className="text-small font-medium text-ink">Bio</label>
            <textarea
              id={`${id}-bio`}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={MAX_BIO_LENGTH}
              rows={4}
              placeholder="Tell other hikers about yourself"
              disabled={pending}
              aria-describedby={`${id}-bio-count`}
              className="rounded-control border border-field-border px-3 py-2"
            />
            <p id={`${id}-bio-count`} className="self-end text-small text-text-subtle">
              {bio.length}/{MAX_BIO_LENGTH}
            </p>
          </div>
          {error && <p role="alert" className="text-danger">{error}</p>}
          <div className="flex gap-4">
            <button type="submit" disabled={pending} className="rounded-control bg-primary px-4 py-2 text-on-primary disabled:opacity-50">
              {pending ? "Saving..." : "Save profile"}
            </button>
            <button type="button" disabled={pending} onClick={() => setEditing(false)} className="text-ink">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={open} className="rounded-control border border-primary px-4 py-2 text-primary">
            Edit profile
          </button>
          {saved && <p role="status" className="text-small text-text-subtle">Profile saved.</p>}
        </div>
      )}
    </section>
  );
}
