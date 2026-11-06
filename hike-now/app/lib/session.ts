import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/app/db";
import { hiker, hikerSession } from "@/app/db/schema";

const COOKIE_NAME = "hike_now_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(hikerId: string) {
  const cookieStore = await cookies();
  const previous = cookieStore.get(COOKIE_NAME)?.value;
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
  await db.transaction(async (tx) => {
    if (previous) {
      await tx.delete(hikerSession).where(eq(hikerSession.tokenHash, tokenHash(previous)));
    }
    await tx.insert(hikerSession).values({ tokenHash: tokenHash(token), hikerId, expiresAt });
  });
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
    expires: expiresAt,
  });
}

export const getCurrentUser = cache(async () => {
  await connection();
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const [user] = await db
    .select({ id: hiker.id, email: hiker.email })
    .from(hikerSession)
    .innerJoin(hiker, eq(hikerSession.hikerId, hiker.id))
    .where(and(eq(hikerSession.tokenHash, tokenHash(token)), gt(hikerSession.expiresAt, new Date())))
    .limit(1);
  return user ?? null;
});

export async function deleteSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    await db.delete(hikerSession).where(eq(hikerSession.tokenHash, tokenHash(token)));
  }
  cookieStore.delete(COOKIE_NAME);
}
