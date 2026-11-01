'use server';

import { db } from "@/app/db";
import { group } from "@/app/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// 1. SELECT ALL GROUPS
export async function getGroups() {
  return await db.select().from(group);
}

// 2. SELECT GROUP BY ID
export async function getGroupById(id: string) {
  const [data] = await db.select().from(group).where(eq(group.id, id));
  return data || null;
}

// 3. INSERT GROUP
export async function createGroup(data: Omit<typeof group.$inferInsert, "id">) {
  const [newGroup] = await db
    .insert(group)
    .values(data)
    .returning();

  revalidatePath("/groups");
  return newGroup;
}

// 4. UPDATE GROUP
export async function updateGroup(
  id: string,
  data: Partial<Omit<typeof group.$inferInsert, "id">>
) {
  const [updatedGroup] = await db
    .update(group)
    .set(data)
    .where(eq(group.id, id))
    .returning();

  revalidatePath(`/groups/${id}`);
  revalidatePath("/groups");
  return updatedGroup;
}

// 5. DELETE GROUP
export async function deleteGroup(id: string) {
  await db.delete(group).where(eq(group.id, id));
  revalidatePath("/groups");
}