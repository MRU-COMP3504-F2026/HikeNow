// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(), insert: vi.fn(), values: vi.fn(), returning: vi.fn(),
  hashPassword: vi.fn(), checkAuthRateLimit: vi.fn(), revalidateTag: vi.fn(),
}));
vi.mock("@/app/db", () => ({ db: { select: mocks.select, insert: mocks.insert } }));
vi.mock("@/app/lib/password", () => ({ hashPassword: mocks.hashPassword }));
vi.mock("@/app/lib/auth-rate-limit", () => ({ checkAuthRateLimit: mocks.checkAuthRateLimit }));
vi.mock("next/cache", () => ({
  unstable_cache: (callback: () => unknown) => callback,
  revalidateTag: mocks.revalidateTag, revalidatePath: vi.fn(),
}));
import { createHiker, getHikers, getHikerById } from "./hikers";
import { hiker } from "@/app/db/schema";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.hashPassword.mockResolvedValue("scrypt-hash");
  mocks.insert.mockReturnValue({ values: mocks.values });
  mocks.values.mockReturnValue({ onConflictDoNothing: () => ({ returning: mocks.returning }) });
  mocks.returning.mockResolvedValue([{ id: "hiker-id", email: "a@b.co", description: null }]);
});

it("hashes the password before insertion and never accepts a caller-provided identity", async () => {
  const result = await createHiker({ id: "caller-id", email: " A@B.CO ", password: "password1" });
  expect(mocks.hashPassword).toHaveBeenCalledWith("password1");
  expect(mocks.values).toHaveBeenCalledWith({ email: "a@b.co", password: "scrypt-hash", description: undefined });
  expect(result).not.toHaveProperty("password");
  expect(mocks.returning).toHaveBeenCalledWith({ id: hiker.id, email: hiker.email, description: hiker.description });
});

it("validates creation and explicitly rejects duplicate emails", async () => {
  await expect(createHiker({ email: "a@b.co", password: "short" })).rejects.toThrow("at least 8");
  expect(mocks.insert).not.toHaveBeenCalled();
  mocks.returning.mockResolvedValue([]);
  await expect(createHiker({ email: "a@b.co", password: "password1" })).rejects.toThrow("already exists");
  expect(mocks.revalidateTag).not.toHaveBeenCalled();
});

it("projects only public fields for both hiker reads", async () => {
  const rows = [{ id: "hiker-id", email: "a@b.co", description: null }];
  mocks.select.mockReturnValue({
    from: () => Object.assign(Promise.resolve(rows), { where: vi.fn().mockResolvedValue(rows) }),
  });
  expect(await getHikers()).toEqual(rows);
  expect(await getHikerById("hiker-id")).toEqual(rows[0]);
  expect(mocks.select).toHaveBeenCalledWith({ id: hiker.id, email: hiker.email, description: hiker.description });
});
