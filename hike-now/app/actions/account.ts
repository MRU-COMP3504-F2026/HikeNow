"use server";

import { eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/app/db";
import { hiker } from "@/app/db/schema";
import { getCurrentUser, deleteSession } from "@/app/lib/session";
import { verifyPassword } from "@/app/lib/password";
import { checkAuthRateLimit } from "@/app/lib/auth-rate-limit";
import type { AuthResult } from "@/app/lib/auth-validation";

export async function deleteAccount(password: string): Promise<AuthResult> {
  let user: Awaited<ReturnType<typeof getCurrentUser>>;
  try {
    user = await getCurrentUser();
  } catch (error) {
    console.error("Account deletion failed:", error);
    return { success: false, error: "Could not complete account deletion. Please try again later." };
  }
  if (!user) redirect("/login");

  try {
    if (typeof password !== "string" || !password || password.length > 1024) {
      return { success: false, error: "Enter your current password to confirm deletion." };
    }
    await checkAuthRateLimit(user.email);
    const [account] = await db.select({ password: hiker.password })
      .from(hiker).where(eq(hiker.id, user.id)).limit(1);
    if (!account || !await verifyPassword(password, account.password)) {
      return { success: false, error: "Incorrect password. Your account was not deleted." };
    }
    // Foreign keys cascade reviews, memberships, follows, and all sessions.
    await db.delete(hiker).where(eq(hiker.id, user.id));
    await deleteSession();
    revalidateTag("hikers", { expire: 0 });
    revalidateTag(`hiker-${user.id}`, { expire: 0 });
    revalidateTag("reviews", { expire: 0 });
    revalidatePath("/profile", "layout");
    revalidatePath("/reviews", "layout");
  } catch (error) {
    console.error("Account deletion failed:", error);
    return { success: false, error: "Could not complete account deletion. Please try again later." };
  }
  redirect("/login");
}
