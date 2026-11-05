'use server';

import { db } from "@/app/db";
import { hiker } from "@/app/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { validateCredentials } from "@/app/lib/auth-validation";
import { hashPassword } from "@/app/lib/password";
import { checkAuthRateLimit } from "@/app/lib/auth-rate-limit";

const publicHiker = { id: hiker.id, email: hiker.email, description: hiker.description };

// 1. SELECT ALL HIKERS (Cached for prerendering)
export const getHikers = unstable_cache(
  async () => {
    return await db.select(publicHiker).from(hiker);
  },
  ["all-hikers-public"],
  { tags: ["hikers"] }
);

// 2. SELECT HIKER BY ID
export async function getHikerById(id: string) {
  return unstable_cache(
    async () => {
      const [data] = await db.select(publicHiker).from(hiker).where(eq(hiker.id, id));
      return data || null;
    },
    [`hiker-public-${id}`],
    { tags: [`hiker-${id}`] }
  )();
}

// 3. CREATE HIKER
export async function createHiker(data: typeof hiker.$inferInsert) {
  const validated = validateCredentials(data, true);
  if ("error" in validated) throw new Error(validated.error);
  if (data.description != null && (typeof data.description !== "string" || data.description.length > 5000)) {
    throw new Error("Description must be at most 5000 characters.");
  }
  await checkAuthRateLimit(validated.credentials.email);
  const [newHiker] = await db.insert(hiker).values({
    email: validated.credentials.email,
    password: await hashPassword(validated.credentials.password),
    description: data.description,
  }).onConflictDoNothing().returning(publicHiker);
  if (!newHiker) throw new Error("An account with this email already exists.");
  revalidateTag("hikers", { expire: 0 });
  revalidatePath("/hikers");
  return newHiker;
}