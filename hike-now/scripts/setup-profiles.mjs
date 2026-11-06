import "dotenv/config";
import { readFile } from "node:fs/promises";
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("Set DATABASE_URL before running db:profiles.");
}

const client = postgres(process.env.DATABASE_URL);
try {
  const migrations = await Promise.all(["0002_profiles.sql", "0005_display_names.sql"].map((file) =>
    readFile(new URL(`../app/db/migrations/${file}`, import.meta.url), "utf8")));
  await client.begin(async (tx) => {
    for (const migration of migrations) await tx.unsafe(migration);
  });
  console.log("Profile schema ready; existing unknown dates and names preserved.");
} finally {
  await client.end();
}
