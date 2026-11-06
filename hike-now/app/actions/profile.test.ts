// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { hiker } from "@/app/db/schema";
import { validateProfile } from "@/app/lib/profile";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(), update: vi.fn(), set: vi.fn(), where: vi.fn(), returning: vi.fn(),
  redirect: vi.fn(), revalidateTag: vi.fn(), revalidatePath: vi.fn(),
}));
vi.mock("@/app/db", () => ({ db: { update: mocks.update } }));
vi.mock("@/app/lib/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag, revalidatePath: mocks.revalidatePath }));
import { updateProfile } from "./profile";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getCurrentUser.mockResolvedValue({ id: "current-hiker", email: "alex@example.com" });
  mocks.update.mockReturnValue({ set: mocks.set });
  mocks.set.mockReturnValue({ where: mocks.where });
  mocks.where.mockReturnValue({ returning: mocks.returning });
  mocks.returning.mockImplementation(async () => [{
    displayName: mocks.set.mock.calls[0][0].displayName, bio: mocks.set.mock.calls[0][0].description,
  }]);
  mocks.redirect.mockImplementation(() => { throw new Error("NEXT_REDIRECT"); });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

it("saves a trimmed name and bio only for the signed-in hiker and refreshes cached profiles", async () => {
  expect(await updateProfile("  Alex Summit ", " Loves ridges.\r\nAnd lakes. ")).toEqual({
    success: true, profile: { displayName: "Alex Summit", bio: "Loves ridges.\nAnd lakes." },
  });
  expect(mocks.update).toHaveBeenCalledWith(hiker);
  expect(mocks.set).toHaveBeenCalledWith({ displayName: "Alex Summit", description: "Loves ridges.\nAnd lakes." });
  expect(mocks.where).toHaveBeenCalledOnce();
  expect(mocks.revalidateTag).toHaveBeenCalledWith("hikers", { expire: 0 });
  expect(mocks.revalidateTag).toHaveBeenCalledWith("hiker-current-hiker", { expire: 0 });
});

it("clears blank values so the email-derived name is used again", async () => {
  await updateProfile("   ", "  ");
  expect(mocks.set).toHaveBeenCalledWith({ displayName: null, description: null });
});

it.each([
  ["a long name", "x".repeat(51), "", "Names must be at most 50 characters."],
  ["a multi-line name", "Alex\nSummit", "", "Names cannot contain line breaks or hidden characters."],
  ["a long bio", "Alex", "x".repeat(501), "Bios must be at most 500 characters."],
  ["control characters in a bio", "Alex", "hi\u0000there", "Bios cannot contain hidden control characters."],
  ["non-string input", 42 as unknown as string, "", "Enter a valid name and bio."],
])("rejects %s without writing", async (_case, name, bio, error) => {
  expect(await updateProfile(name, bio)).toEqual({ success: false, error });
  expect(mocks.update).not.toHaveBeenCalled();
});

it("accepts values exactly at the limits", () => {
  expect(validateProfile({ displayName: "x".repeat(50), bio: "y".repeat(500) })).toEqual({
    profile: { displayName: "x".repeat(50), bio: "y".repeat(500) },
  });
});

it("redirects signed-out or deleted hikers to login", async () => {
  mocks.getCurrentUser.mockResolvedValueOnce(null);
  await expect(updateProfile("Alex", "")).rejects.toThrow("NEXT_REDIRECT");
  expect(mocks.update).not.toHaveBeenCalled();

  mocks.returning.mockReset().mockResolvedValue([]);
  await expect(updateProfile("Alex", "")).rejects.toThrow("NEXT_REDIRECT");
  expect(mocks.revalidateTag).not.toHaveBeenCalled();
});

it("returns a generic error when the database fails", async () => {
  mocks.returning.mockReset().mockRejectedValue(new Error("connection lost"));
  expect(await updateProfile("Alex", "")).toEqual({
    success: false, error: "Could not save your profile. Please try again later.",
  });
});
