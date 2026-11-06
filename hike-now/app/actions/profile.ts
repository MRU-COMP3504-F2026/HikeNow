"use server";

import { eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/app/db";
import { hiker } from "@/app/db/schema";
import { getCurrentUser } from "@/app/lib/session";
import { validateProfile, type ProfileResult } from "@/app/lib/profile";

export async function updateProfile(displayName: string, bio: string): Promise<ProfileResult> {
  let user: Awaited<ReturnType<typeof getCurrentUser>>;
  try {
    user = await getCurrentUser();
  } catch (error) {
    console.error("Profile update failed:", error);
    return { success: false, error: "Could not save your profile. Please try again later." };
  }
  if (!user) redirect("/login");

  const validated = validateProfile({ displayName, bio });
  if ("error" in validated) return { success: false, error: validated.error };

  let saved: { displayName: string | null; bio: string | null } | undefined;
  try {
    [saved] = await db.update(hiker)
      .set({ displayName: validated.profile.displayName, description: validated.profile.bio })
      .where(eq(hiker.id, user.id))
      .returning({ displayName: hiker.displayName, bio: hiker.description });
    if (saved) {
      revalidateTag("hikers", { expire: 0 });
      revalidateTag(`hiker-${user.id}`, { expire: 0 });
      revalidatePath("/profile", "layout");
      revalidatePath("/reviews", "layout");
      revalidatePath("/search");
      revalidatePath("/chats");
    }
  } catch (error) {
    console.error("Profile update failed:", error);
    return { success: false, error: "Could not save your profile. Please try again later." };
  }
  if (!saved) redirect("/login");
  return { success: true, profile: saved };
}
