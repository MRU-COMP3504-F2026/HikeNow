import { eq } from "drizzle-orm";
import { hikerHikes } from "../db/schema"; // adjust to match your existing schema import
import { getCurrentUser } from "../lib/session"; // adjust path if needed
import type { TrailStatus } from "../components/trail-status-dropdown";
import { db } from "../db";

export async function getUserTrailStatuses(): Promise<
  Record<string, TrailStatus>
> {
  const user = await getCurrentUser();
  if (!user) return {};

  const rows = await db
    .select({
      hikeId: hikerHikes.hikeId,
      status: hikerHikes.status,
    })
    .from(hikerHikes)
    .where(eq(hikerHikes.hikerId, user.id));

  return Object.fromEntries(rows.map((row) => [row.hikeId, row.status]));
}