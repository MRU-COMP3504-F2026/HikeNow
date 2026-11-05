// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { hiker } from "@/app/db/schema";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(), deleteSession: vi.fn(), verifyPassword: vi.fn(),
  checkAuthRateLimit: vi.fn(), select: vi.fn(), limit: vi.fn(), delete: vi.fn(),
  where: vi.fn(), redirect: vi.fn(), revalidateTag: vi.fn(),
}));
vi.mock("@/app/db", () => ({ db: { select: mocks.select, delete: mocks.delete } }));
vi.mock("@/app/lib/session", () => ({ getCurrentUser: mocks.getCurrentUser, deleteSession: mocks.deleteSession }));
vi.mock("@/app/lib/password", () => ({ verifyPassword: mocks.verifyPassword }));
vi.mock("@/app/lib/auth-rate-limit", () => ({ checkAuthRateLimit: mocks.checkAuthRateLimit }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag, revalidatePath: vi.fn() }));
import { deleteAccount } from "./account";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getCurrentUser.mockResolvedValue({ id: "current-hiker", email: "hiker@example.com" });
  mocks.select.mockReturnValue({ from: () => ({ where: () => ({ limit: mocks.limit }) }) });
  mocks.limit.mockResolvedValue([{ password: "stored-hash" }]);
  mocks.verifyPassword.mockResolvedValue(true);
  mocks.delete.mockReturnValue({ where: mocks.where });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

it("requires a session and a current password before deleting", async () => {
  mocks.getCurrentUser.mockResolvedValue(null);
  expect(await deleteAccount("password1")).toHaveProperty("success", false);
  expect(mocks.select).not.toHaveBeenCalled();
  mocks.getCurrentUser.mockResolvedValue({ id: "current-hiker", email: "hiker@example.com" });
  expect(await deleteAccount("")).toHaveProperty("success", false);
  mocks.verifyPassword.mockResolvedValue(false);
  expect(await deleteAccount("wrong")).toEqual({ success: false, error: "Incorrect password. Your account was not deleted." });
  expect(mocks.delete).not.toHaveBeenCalled();
  expect(mocks.redirect).not.toHaveBeenCalled();
});

it("deletes only the session account, clears its cookie, invalidates caches, then redirects", async () => {
  await deleteAccount("password1");
  expect(mocks.checkAuthRateLimit).toHaveBeenCalledWith("hiker@example.com");
  expect(mocks.verifyPassword).toHaveBeenCalledWith("password1", "stored-hash");
  expect(mocks.delete).toHaveBeenCalledWith(hiker);
  expect(mocks.where).toHaveBeenCalledWith(eq(hiker.id, "current-hiker"));
  expect(mocks.deleteSession).toHaveBeenCalled();
  expect(mocks.revalidateTag).toHaveBeenCalledWith("reviews", { expire: 0 });
  expect(mocks.redirect).toHaveBeenCalledWith("/login");
  expect(mocks.where.mock.invocationCallOrder[0]).toBeLessThan(mocks.deleteSession.mock.invocationCallOrder[0]);
});

it("surfaces a deletion failure without logging out or exposing database details", async () => {
  mocks.where.mockRejectedValue(new Error("private db details"));
  expect(await deleteAccount("password1")).toEqual({ success: false, error: "Could not complete account deletion. Please try again later." });
  expect(console.error).toHaveBeenCalled();
  expect(mocks.deleteSession).not.toHaveBeenCalled();
  expect(mocks.redirect).not.toHaveBeenCalled();
});
