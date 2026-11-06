"use client";

import { useActionState, useState } from "react";
import { deleteAccount } from "@/app/actions/account";
import type { AuthResult } from "@/app/lib/auth-validation";

export default function DeleteAccount() {
  const [confirming, setConfirming] = useState(false);
  const [result, action, pending] = useActionState(
    async (_previous: AuthResult | null, formData: FormData) => {
      const password = formData.get("password");
      return deleteAccount(typeof password === "string" ? password : "");
    },
    null,
  );

  return (
    <section aria-label="Account settings" className="mt-10 rounded-control border border-border p-6">
      <h2 className="mb-3 text-heading font-semibold text-ink">Account settings</h2>
      <p className="mb-4 text-small text-text-subtle">
        Deleting your account permanently removes your profile, reviews, group memberships,
        follows, and all active sessions. This cannot be undone.
      </p>
      {confirming ? (
        <form action={action} className="flex max-w-md flex-col gap-3">
          <label htmlFor="delete-password" className="text-small font-medium text-ink">Confirm your current password</label>
          <input id="delete-password" name="password" type="password" autoComplete="current-password" required disabled={pending}
            className="rounded-control border border-field-border px-3 py-2" />
          {result && !result.success && <p role="alert" className="text-danger">{result.error}</p>}
          <div className="flex gap-4">
            <button type="submit" disabled={pending} className="rounded-control bg-danger px-4 py-2 text-white disabled:opacity-50">
              {pending ? "Deleting..." : "Permanently delete account"}
            </button>
            <button type="button" disabled={pending} onClick={() => setConfirming(false)} className="text-ink">Cancel</button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className="rounded-control border border-danger px-4 py-2 text-danger">
          Delete account
        </button>
      )}
    </section>
  );
}
