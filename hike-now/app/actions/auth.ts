"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/app/db";
import { hiker } from "@/app/db/schema";
import { createHiker } from "./hikers";
import { validateCredentials, type AuthResult, type Credentials } from "@/app/lib/auth-validation";
import { verifyPassword } from "@/app/lib/password";
import { createSession, deleteSession } from "@/app/lib/session";
import { AuthRateLimitError, checkAuthRateLimit } from "@/app/lib/auth-rate-limit";

export async function login(input: Credentials): Promise<AuthResult> {
  const validated = validateCredentials(input);
  if ("error" in validated) return { success: false, error: validated.error };
  const { email, password } = validated.credentials;
  try {
    await checkAuthRateLimit(email);
    const [user] = await db.select({ id: hiker.id, password: hiker.password })
      .from(hiker).where(eq(sql`lower(${hiker.email})`, email)).limit(1);
    if (!await verifyPassword(password, user?.password ?? "") || !user) {
      return { success: false, error: "Invalid email or password." };
    }
    await createSession(user.id);
    return { success: true };
  } catch (error) {
    console.error("Login failed:", error);
    return { success: false, error: error instanceof AuthRateLimitError ? error.message : "Could not log in. Please try again later." };
  }
}

export async function signup(input: Credentials): Promise<AuthResult> {
  const validated = validateCredentials(input, true);
  if ("error" in validated) return { success: false, error: validated.error };
  let user: Awaited<ReturnType<typeof createHiker>>;
  try {
    user = await createHiker(validated.credentials);
  } catch (error) {
    console.error("Signup failed:", error);
    return {
      success: false,
      error: error instanceof AuthRateLimitError || (error instanceof Error && error.message === "An account with this email already exists.")
        ? error.message
        : "Could not create your account. Please try again later.",
    };
  }
  try {
    await createSession(user.id);
    return { success: true };
  } catch (error) {
    console.error("Session creation after signup failed:", error);
    return { success: false, error: "Your account was created, but we could not log you in. Please use the Login tab." };
  }
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
