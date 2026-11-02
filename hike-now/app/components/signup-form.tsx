"use client";

import { useState, type FormEvent } from "react";
import Button from "./button";
import FormField from "./form-field";
import { EMAIL_PATTERN } from "./login-form";
import PasswordField from "./password-field";

export type SignupValues = { email: string; password: string };

export type SignupFormProps = {
  /** Se llama con los datos cuando pasan la validación. Si lanza, se muestra el error. */
  onSubmit: (values: SignupValues) => void | Promise<void>;
  className?: string;
};

export const MIN_PASSWORD_LENGTH = 8;

type Errors = Partial<Record<"email" | "password" | "confirmPassword", string>>;

/** Formulario de la pestaña Signup: email + contraseña + confirmación. Solo UI y validación. */
export default function SignupForm({ onSubmit, className = "" }: SignupFormProps) {
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");

    const next: Errors = {};
    if (!email) next.email = "Please enter your email.";
    else if (!EMAIL_PATTERN.test(email)) next.email = "Please enter a valid email.";
    if (password.length < MIN_PASSWORD_LENGTH) {
      next.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (confirmPassword !== password) next.confirmPassword = "Passwords do not match.";
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    setPending(true);
    try {
      await onSubmit({ email, password });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create the account.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Signup"
      className={["flex flex-col gap-5", className].join(" ")}
    >
      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        required
        error={errors.email}
      />
      <PasswordField
        label="Password"
        name="password"
        autoComplete="new-password"
        required
        hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        error={errors.password}
      />
      <PasswordField
        label="Confirm password"
        name="confirmPassword"
        autoComplete="new-password"
        required
        error={errors.confirmPassword}
      />

      {formError && (
        <p role="alert" className="text-small text-danger">
          {formError}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating account…" : "Sign up"}
      </Button>
    </form>
  );
}
