// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

import { hashPassword, verifyPassword } from "./password";
import { validateCredentials } from "./auth-validation";

describe("password hashing", () => {
  it("salts hashes uniquely and verifies only the correct password", async () => {
    const first = await hashPassword("longenough1");
    const second = await hashPassword("longenough1");
    expect(first).toMatch(/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
    expect(first).not.toEqual(second);
    expect(first).not.toContain("longenough1");
    expect(await verifyPassword("longenough1", first)).toBe(true);
    expect(await verifyPassword("wrongpassword", first)).toBe(false);
  });

  it("rejects legacy plaintext, malformed hashes and missing users", async () => {
    for (const hash of ["", "longenough1", "scrypt$bad$bad"]) {
      expect(await verifyPassword("longenough1", hash)).toBe(false);
    }
  });
});

describe("server credential validation", () => {
  it("normalizes email without trimming passwords", () => {
    expect(validateCredentials({ email: " Hiker@Example.com ", password: " space ok " }, true))
      .toEqual({ credentials: { email: "hiker@example.com", password: " space ok " } });
  });

  it("rejects malformed payloads and out-of-bounds inputs", () => {
    for (const input of [null, {}, { email: 42, password: "password" }, { email: "bad", password: "password" }]) {
      expect(validateCredentials(input)).toHaveProperty("error");
    }
    expect(validateCredentials({ email: "a@b.co", password: "short" }, true)).toHaveProperty("error");
    expect(validateCredentials({ email: "a@b.co", password: "a".repeat(129) })).toHaveProperty("error");
    expect(validateCredentials({ email: `${"a".repeat(251)}@b.co`, password: "password" })).toHaveProperty("error");
  });
});
