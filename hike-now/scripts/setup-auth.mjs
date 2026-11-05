import "dotenv/config";
import { readFile } from "node:fs/promises";
import postgres from "postgres";
import { hashPassword } from "../app/lib/password.ts";

if (!process.env.DATABASE_URL) {
  throw new Error("Set DATABASE_URL to the server-side PostgreSQL connection before running db:auth.");
}

const client = postgres(process.env.DATABASE_URL);
try {
  const migration = await readFile(new URL("../app/db/migrations/0001_auth.sql", import.meta.url), "utf8");
  await client.begin(async (tx) => {
    await tx.unsafe(migration);
    const hikers = await tx`SELECT id, password FROM public.hiker FOR UPDATE`;
    for (const hiker of hikers) {
      if (/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(hiker.password)) continue;
      if (/^\$(?:2[aby]\$|argon2(?:id|i|d)\$|scrypt\$)/.test(hiker.password) || hiker.password.startsWith("scrypt$")) {
        throw new Error("Found an unsupported password hash. Migrate it explicitly before running db:auth.");
      }
      const hash = await hashPassword(hiker.password);
      await tx`UPDATE public.hiker SET password = ${hash} WHERE id = ${hiker.id}`;
    }
    await tx`DELETE FROM public.hiker_session WHERE expires_at <= now()`;
    await tx`DELETE FROM public.auth_attempt WHERE resets_at <= now()`;
  });
  console.log("Authentication schema ready; legacy plaintext passwords hashed.");
} finally {
  await client.end();
}
