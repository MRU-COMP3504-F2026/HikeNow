"use client";

import { useState, type FormEvent } from "react";
import Button from "./button";
import FormField from "./form-field";
import PasswordField from "./password-field";

export type LoginValues = { email: string; password: string };

export type LoginFormProps = {
  /** Se llama con los datos cuando pasan la validación. Si lanza, se muestra el error. */
  onSubmit: (values: LoginValues) => void | Promise<void>;
  className?: string;
};

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Formulario de la pestaña Login: email + contraseña. Solo UI y validación; la autenticación va en onSubmit. */
export default function LoginForm({ onSubmit, className = "" }: LoginFormProps) {
  const [errors, setErrors] = useState<Partial<Record<keyof LoginValues, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const values = {
      email: String(data.get("email") ?? "").trim(),
      password: String(data.get("password") ?? ""),
    };

    const next: typeof errors = {};
    if (!values.email) next.email = "Please enter your email.";
    else if (!EMAIL_PATTERN.test(values.email)) next.email = "Please enter a valid email.";
    if (!values.password) next.password = "Please enter your password.";
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    setPending(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not log in.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Login"
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
        autoComplete="current-password"
        required
        error={errors.password}
      />

      {formError && (
        <p role="alert" className="text-small text-danger">
          {formError}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Logging in…" : "Login"}
      </Button>
    </form>
  );
}
