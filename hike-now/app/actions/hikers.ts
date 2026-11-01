'use server';

import { db } from "@/app/db";
import { hiker } from "@/app/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

// 1. SELECT ALL HIKERS (Cached for prerendering)
export const getHikers = unstable_cache(
  async () => {
    return await db.select().from(hiker);
  },
  ["all-hikers"],
  { tags: ["hikers"] }
);

// 2. SELECT HIKER BY ID
export async function getHikerById(id: string) {
  return unstable_cache(
    async () => {
      const [data] = await db.select().from(hiker).where(eq(hiker.id, id));
      return data || null;
    },
    [`hiker-${id}`],
    { tags: [`hiker-${id}`] }
  )();
}

// 3. CREATE HIKER
export async function createHiker(data: typeof hiker.$inferInsert) {
  const [newHiker] = await db.insert(hiker).values(data).returning();
  revalidateTag("hikers", { expire: 0 });
  revalidatePath("/hikers");
  return newHiker;
}