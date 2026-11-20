"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "../db"; // adjust to your db import
import { hikerHikes } from "../db/schema";
import { getCurrentUser } from "../lib/session"; // adjust relative path if needed
import type { TrailStatus } from "../components/trail-status-dropdown";

export async function updateTrailStatus(hikeId: string, status: TrailStatus) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  if (status === "not-started") {
    await db
      .delete(hikerHikes)
      .where(
        and(eq(hikerHikes.hikerId, user.id), eq(hikerHikes.hikeId, hikeId))
      );
  } else {
    await db
      .insert(hikerHikes)
      .values({
        hikerId: user.id,
        hikeId,
        status,
        loggedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [hikerHikes.hikerId, hikerHikes.hikeId],
        set: {
          status,
          loggedAt: new Date(),
        },
      });
  }

  revalidatePath("/"); // adjust to the route(s) displaying TrailCard
}