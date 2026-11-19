'use server';

import { db } from "@/app/db";
import { hike, review } from "@/app/db/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { revalidatePath, unstable_cache } from "next/cache";

// 1. SELECT ALL HIKES (Cached for prerendering)
export const getHikes = unstable_cache(
  async () => {
    return await db.select().from(hike);
  },
  ["all-hikes"],
  { tags: ["hikes"] }
);

export const getHikeReviewAverages = unstable_cache(
  async () =>
    db
      .select({
        hikeId: review.hikeId,
        averageRating: sql<number>`avg(${review.rating})::float8`,
      })
      .from(review)
      .where(and(gte(review.rating, "1"), lte(review.rating, "5")))
      .groupBy(review.hikeId),
  ["hike-review-averages-v1"],
  { tags: ["reviews"] }
);

// 2. SELECT HIKE BY ID (Cached per ID)
export async function getHikeById(id: string) {
  return unstable_cache(
    async () => {
      const [data] = await db.select().from(hike).where(eq(hike.id, id));
      return data || null;
    },
    [`hike-${id}`],
    { tags: [`hike-${id}`] }
  )();
}

// 3. INSERT HIKE
export async function createHike(data: Omit<typeof hike.$inferInsert, "id">) {
  const [newHike] = await db.insert(hike).values(data).returning();
  revalidatePath("/hikes");
  return newHike;
}

// 4. UPDATE HIKE
export async function updateHike(
  id: string,
  data: Partial<Omit<typeof hike.$inferInsert, "id">>
) {
  const [updatedHike] = await db
    .update(hike)
    .set(data)
    .where(eq(hike.id, id))
    .returning();

  revalidatePath(`/hikes/${id}`);
  revalidatePath("/hikes");
  return updatedHike;
}

// 5. DELETE HIKE
export async function deleteHike(id: string) {
  await db.delete(hike).where(eq(hike.id, id));
  revalidatePath("/hikes");
}