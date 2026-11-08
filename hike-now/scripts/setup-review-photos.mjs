import "dotenv/config";
import { readFile } from "node:fs/promises";
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("Set DATABASE_URL before running db:review-photos.");
}

const client = postgres(process.env.DATABASE_URL);
try {
  const migration = await readFile(new URL("../app/db/migrations/0006_review_photos.sql", import.meta.url), "utf8");
  await client.begin((tx) => tx.unsafe(migration));
  console.log("Review photo storage bucket ready.");
} finally {
  await client.end();
}
