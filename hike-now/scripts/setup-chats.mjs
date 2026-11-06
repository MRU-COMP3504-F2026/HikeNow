import "dotenv/config";
import { readFile } from "node:fs/promises";
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("Set DATABASE_URL before running db:chats.");
}

const client = postgres(process.env.DATABASE_URL);
try {
  const migrations = await Promise.all(
    ["0003_chats.sql", "0004_group_chats.sql"].map((file) =>
      readFile(new URL(`../app/db/migrations/${file}`, import.meta.url), "utf8")),
  );
  await client.begin(async (tx) => {
    for (const migration of migrations) await tx.unsafe(migration);
  });
  console.log("Chat schema ready.");
} finally {
  await client.end();
}
