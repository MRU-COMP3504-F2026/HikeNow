"use client";

import LoginForm, { type LoginFormProps } from "./login-form";
import SignupForm, { type SignupFormProps } from "./signup-form";
import Tabs from "./tabs";

export type AuthTabsProps = {
  onLogin: LoginFormProps["onSubmit"];
  onSignup: SignupFormProps["onSubmit"];
  /** Pestaña con la que se abre. */
  initialTab?: "login" | "signup";
  className?: string;
};

/** Contenedor con las pestañas Login y Signup. */
export default function AuthTabs({
  onLogin,
  onSignup,
  initialTab = "login",
  className = "",
}: AuthTabsProps) {
  return (
    <Tabs
      defaultTabId={initialTab}
      className={className}
      tabs={[
        { id: "login", label: "Login", content: <LoginForm onSubmit={onLogin} /> },
        { id: "signup", label: "Sign up", content: <SignupForm onSubmit={onSignup} /> },
      ]}
    />
  );
}
