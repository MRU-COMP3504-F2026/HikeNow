'use server';

import { db } from "@/app/db";
import { follow } from "@/app/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// 1. SELECT ALL FOLLOW RELATIONS
export async function getFollows() {
  return await db.select().from(follow);
}

// 2. SELECT FOLLOWERS OF A HIKER (People following this user)
export async function getFollowers(followeeId: string) {
  return await db
    .select()
    .from(follow)
    .where(eq(follow.followeeId, followeeId));
}

// 3. SELECT FOLLOWING OF A HIKER (People this user is following)
export async function getFollowing(followerId: string) {
  return await db
    .select()
    .from(follow)
    .where(eq(follow.followerId, followerId));
}

// 4. INSERT FOLLOW (Follow a user)
export async function followUser(followerId: string, followeeId: string) {
  const [newFollow] = await db
    .insert(follow)
    .values({ followerId, followeeId })
    .returning();

  revalidatePath(`/hikers/${followeeId}`);
  revalidatePath(`/hikers/${followerId}`);
  return newFollow;
}

// 5. DELETE FOLLOW (Unfollow a user)
export async function unfollowUser(followerId: string, followeeId: string) {
  await db
    .delete(follow)
    .where(
      and(
        eq(follow.followerId, followerId),
        eq(follow.followeeId, followeeId)
      )
    );

  revalidatePath(`/hikers/${followeeId}`);
  revalidatePath(`/hikers/${followerId}`);
}