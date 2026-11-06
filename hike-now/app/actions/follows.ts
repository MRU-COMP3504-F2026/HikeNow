'use server';

import { db } from "@/app/db";
import { follow } from "@/app/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/session";

async function requireFollower(followerId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.id !== followerId) throw new Error("Cannot change another user's follows.");
}

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
  await requireFollower(followerId);
  if (followerId === followeeId) throw new Error("You cannot follow yourself.");
  const [newFollow] = await db
    .insert(follow)
    .values({ followerId, followeeId })
    .onConflictDoNothing()
    .returning();

  revalidatePath(`/profile/${followeeId}`);
  revalidatePath(`/profile/${followerId}`);
  revalidatePath("/feed");
  revalidatePath("/chats");
  return newFollow ?? { followerId, followeeId };
}

// 5. DELETE FOLLOW (Unfollow a user)
export async function unfollowUser(followerId: string, followeeId: string) {
  await requireFollower(followerId);
  await db
    .delete(follow)
    .where(
      and(
        eq(follow.followerId, followerId),
        eq(follow.followeeId, followeeId)
      )
    );

  revalidatePath(`/profile/${followeeId}`);
  revalidatePath(`/profile/${followerId}`);
  revalidatePath("/feed");
  revalidatePath("/chats");
}