"use client";

import { useRouter } from "next/navigation";
import { login, signup } from "@/app/actions/auth";
import type { AuthResult, Credentials } from "@/app/lib/auth-validation";
import AuthTabs from "./auth-tabs";

export default function AuthScreen() {
  const router = useRouter();

  async function submit(action: (values: Credentials) => Promise<AuthResult>, values: Credentials) {
    const result = await action(values);
    if (!result.success) throw new Error(result.error);
    router.replace("/");
    router.refresh();
  }

  return (
    <section className="w-full max-w-md rounded-control border border-border bg-background p-6 shadow-control sm:p-8">
      <h1 className="text-title font-semibold text-primary">Welcome to Hike Now!</h1>
      <p className="mb-7 mt-2 text-nav text-text-muted">
        Log in or create an account to start your next adventure.
      </p>
      <AuthTabs
        onLogin={(values) => submit(login, values)}
        onSignup={(values) => submit(signup, values)}
      />
    </section>
  );
}
