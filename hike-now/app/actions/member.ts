'use server';

import { db } from "@/app/db";
import { member } from "@/app/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// 1. SELECT ALL MEMBERSHIPS
export async function getMemberships() {
  return await db.select().from(member);
}

// 2. SELECT MEMBERS OF A SPECIFIC GROUP
export async function getGroupMembers(groupId: string) {
  return await db
    .select()
    .from(member)
    .where(eq(member.groupId, groupId));
}

// 3. SELECT GROUPS A HIKER HAS JOINED
export async function getHikerGroups(hikerId: string) {
  return await db
    .select()
    .from(member)
    .where(eq(member.hikerId, hikerId));
}

// 4. INSERT MEMBER (Join Group)
export async function joinGroup(hikerId: string, groupId: string) {
  const [newMember] = await db
    .insert(member)
    .values({ hikerId, groupId })
    .returning();

  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/hikers/${hikerId}`);
  return newMember;
}

// 5. DELETE MEMBER (Leave Group)
export async function leaveGroup(hikerId: string, groupId: string) {
  await db
    .delete(member)
    .where(
      and(
        eq(member.hikerId, hikerId),
        eq(member.groupId, groupId)
      )
    );

  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/hikers/${hikerId}`);
}