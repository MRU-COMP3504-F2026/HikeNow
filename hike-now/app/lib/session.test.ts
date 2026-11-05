// @vitest-environment node
import { createHash } from "node:crypto";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(), set: vi.fn(), remove: vi.fn(),
  select: vi.fn(), limit: vi.fn(), values: vi.fn(),
  insert: vi.fn(), delete: vi.fn(), where: vi.fn(), transaction: vi.fn(),
  connection: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocks.get, set: mocks.set, delete: mocks.remove }),
}));
vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("@/app/db", () => ({
  db: {
    select: mocks.select, delete: mocks.delete, transaction: mocks.transaction,
  },
}));
import { createSession, deleteSession, getCurrentUser } from "./session";
import { hiker } from "@/app/db/schema";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.insert.mockReturnValue({ values: mocks.values });
  mocks.delete.mockReturnValue({ where: mocks.where });
  mocks.transaction.mockImplementation(async (callback) => callback({ insert: mocks.insert, delete: mocks.delete }));
  mocks.select.mockReturnValue({
    from: () => ({ innerJoin: () => ({ where: () => ({ limit: mocks.limit }) }) }),
  });
});

it("stores only a token hash and sets a seven-day HTTP-only cookie", async () => {
  const before = Date.now();
  await createSession("hiker-id");
  const [name, token, options] = mocks.set.mock.calls[0];
  expect(name).toBe("hike_now_session");
  expect(token).toMatch(/^[a-f0-9]{64}$/);
  expect(options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/", maxAge: 604800 });
  expect(mocks.values).toHaveBeenCalledWith({
    hikerId: "hiker-id",
    tokenHash: createHash("sha256").update(token).digest("hex"),
    expiresAt: options.expires,
  });
  expect(options.expires.getTime()).toBeGreaterThanOrEqual(before + 604800000);
  expect(options.expires.getTime()).toBeLessThanOrEqual(Date.now() + 604800000);
});

it("marks production cookies Secure and replaces previous sessions", async () => {
  vi.stubEnv("NODE_ENV", "production");
  mocks.get.mockReturnValue({ value: "a".repeat(64) });
  await createSession("hiker-id");
  expect(mocks.set.mock.calls[0][2].secure).toBe(true);
  expect(mocks.delete).toHaveBeenCalled();
  vi.unstubAllEnvs();
});

it("does not set a cookie when the database transaction fails", async () => {
  mocks.transaction.mockRejectedValue(new Error("database unavailable"));
  await expect(createSession("hiker-id")).rejects.toThrow("database unavailable");
  expect(mocks.set).not.toHaveBeenCalled();
});

it("rejects missing or malformed session cookies without querying", async () => {
  expect(await getCurrentUser()).toBeNull();
  mocks.get.mockReturnValue({ value: "forged" });
  expect(await getCurrentUser()).toBeNull();
  expect(mocks.select).not.toHaveBeenCalled();
});

it("returns only public identity, or null for expired/revoked sessions", async () => {
  mocks.get.mockReturnValue({ value: "b".repeat(64) });
  mocks.limit.mockResolvedValue([{ id: "hiker-id", email: "a@b.co" }]);
  expect(await getCurrentUser()).toEqual({ id: "hiker-id", email: "a@b.co" });
  expect(mocks.connection).toHaveBeenCalled();
  expect(mocks.connection.mock.invocationCallOrder[0]).toBeLessThan(mocks.get.mock.invocationCallOrder[0]);
  expect(mocks.select).toHaveBeenCalledWith({ id: hiker.id, email: hiker.email });
  mocks.limit.mockResolvedValue([]);
  expect(await getCurrentUser()).toBeNull();
});

it("does not access cookies or evaluate session expiry before request-time rendering", async () => {
  mocks.connection.mockRejectedValue(new Error("prerender suspended"));
  await expect(getCurrentUser()).rejects.toThrow("prerender suspended");
  expect(mocks.get).not.toHaveBeenCalled();
  expect(mocks.select).not.toHaveBeenCalled();
});

it("revokes the database session and deletes the cookie", async () => {
  mocks.get.mockReturnValue({ value: "c".repeat(64) });
  await deleteSession();
  expect(mocks.delete).toHaveBeenCalled();
  expect(mocks.where).toHaveBeenCalled();
  expect(mocks.remove).toHaveBeenCalledWith("hike_now_session");
});
