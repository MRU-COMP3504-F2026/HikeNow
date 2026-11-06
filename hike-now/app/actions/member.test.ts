// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(), redirect: vi.fn(), insert: vi.fn(), values: vi.fn(),
  returning: vi.fn(), delete: vi.fn(), where: vi.fn(), revalidatePath: vi.fn(),
}));
vi.mock("@/app/db", () => ({ db: { insert: mocks.insert, delete: mocks.delete } }));
vi.mock("@/app/lib/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
import { joinGroup, leaveGroup } from "./member";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getCurrentUser.mockResolvedValue({ id: "current-user" });
  mocks.insert.mockReturnValue({ values: mocks.values });
  mocks.values.mockReturnValue({ returning: mocks.returning });
  mocks.returning.mockResolvedValue([{ hikerId: "current-user", groupId: "group" }]);
  mocks.delete.mockReturnValue({ where: mocks.where });
});

it("redirects signed-out membership changes before accessing the database", async () => {
  mocks.getCurrentUser.mockResolvedValue(null);
  mocks.redirect.mockImplementation(() => { throw new Error("NEXT_REDIRECT"); });
  await expect(joinGroup("current-user", "group")).rejects.toThrow("NEXT_REDIRECT");
  await expect(leaveGroup("current-user", "group")).rejects.toThrow("NEXT_REDIRECT");
  expect(mocks.redirect).toHaveBeenCalledWith("/login");
  expect(mocks.insert).not.toHaveBeenCalled();
  expect(mocks.delete).not.toHaveBeenCalled();
});

it("rejects changing someone else's membership", async () => {
  await expect(joinGroup("other-user", "group")).rejects.toThrow("another user's memberships");
  await expect(leaveGroup("other-user", "group")).rejects.toThrow("another user's memberships");
  expect(mocks.insert).not.toHaveBeenCalled();
  expect(mocks.delete).not.toHaveBeenCalled();
});

it("allows a signed-in user to join and leave for their own account", async () => {
  await expect(joinGroup("current-user", "group")).resolves.toEqual({ hikerId: "current-user", groupId: "group" });
  expect(mocks.values).toHaveBeenCalledWith({ hikerId: "current-user", groupId: "group" });
  await leaveGroup("current-user", "group");
  expect(mocks.where).toHaveBeenCalled();
});
