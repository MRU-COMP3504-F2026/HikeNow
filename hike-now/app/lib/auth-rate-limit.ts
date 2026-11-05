import "server-only";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/app/db";
import { authAttempt } from "@/app/db/schema";

export class AuthRateLimitError extends Error {
  constructor() {
    super("Too many attempts. Please try again in 15 minutes.");
  }
}

export async function checkAuthRateLimit(email: string) {
  const key = createHash("sha256").update(email).digest("hex");
  const [attempt] = await db.insert(authAttempt)
    .values({ key, attempts: 1, resetsAt: new Date(Date.now() + 15 * 60 * 1000) })
    .onConflictDoUpdate({
      target: authAttempt.key,
      set: {
        attempts: sql`CASE WHEN ${authAttempt.resetsAt} <= now() THEN 1 ELSE ${authAttempt.attempts} + 1 END`,
        resetsAt: sql`CASE WHEN ${authAttempt.resetsAt} <= now() THEN now() + interval '15 minutes' ELSE ${authAttempt.resetsAt} END`,
      },
    }).returning({ attempts: authAttempt.attempts });
  if (attempt.attempts > 10) throw new AuthRateLimitError();
}
