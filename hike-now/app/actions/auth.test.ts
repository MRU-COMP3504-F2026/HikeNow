// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(), limit: vi.fn(), createHiker: vi.fn(),
  verifyPassword: vi.fn(), createSession: vi.fn(), deleteSession: vi.fn(),
  getCurrentUser: vi.fn(), checkAuthRateLimit: vi.fn(), redirect: vi.fn(),
}));
vi.mock("@/app/db", () => ({ db: { select: mocks.select } }));
vi.mock("./hikers", () => ({ createHiker: mocks.createHiker }));
vi.mock("@/app/lib/password", () => ({ verifyPassword: mocks.verifyPassword }));
vi.mock("@/app/lib/session", () => ({ createSession: mocks.createSession, deleteSession: mocks.deleteSession, getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/app/lib/auth-rate-limit", () => ({
  checkAuthRateLimit: mocks.checkAuthRateLimit,
  AuthRateLimitError: class extends Error {},
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { login, signup, logout, hasActiveSession } from "./auth";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.select.mockReturnValue({ from: () => ({ where: () => ({ limit: mocks.limit }) }) });
  mocks.limit.mockResolvedValue([{ id: "hiker-id", password: "stored-hash" }]);
  mocks.verifyPassword.mockResolvedValue(true);
  mocks.createHiker.mockResolvedValue({ id: "new-hiker", email: "hiker@example.com" });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("auth actions", () => {
  it("validates before accessing the database", async () => {
    expect(await login({ email: "invalid", password: "" })).toHaveProperty("success", false);
    expect(await signup({ email: "a@b.co", password: "short" })).toHaveProperty("success", false);
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.createHiker).not.toHaveBeenCalled();
  });

  it("verifies the stored hash and establishes a session without returning credentials", async () => {
    expect(await login({ email: " HIKER@example.com ", password: "password1" })).toEqual({ success: true });
    expect(mocks.checkAuthRateLimit).toHaveBeenCalledWith("hiker@example.com");
    expect(mocks.verifyPassword).toHaveBeenCalledWith("password1", "stored-hash");
    expect(mocks.createSession).toHaveBeenCalledWith("hiker-id");
  });

  it("uses the same credential error for wrong passwords and missing accounts", async () => {
    mocks.verifyPassword.mockResolvedValue(false);
    const wrong = await login({ email: "hiker@example.com", password: "wrong" });
    mocks.limit.mockResolvedValue([]);
    const missing = await login({ email: "missing@example.com", password: "wrong" });
    expect(missing).toEqual(wrong);
    expect(mocks.verifyPassword).toHaveBeenLastCalledWith("wrong", "");
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("creates an account through createHiker and logs it in", async () => {
    expect(await signup({ email: " HIKER@example.com ", password: "password1" })).toEqual({ success: true });
    expect(mocks.createHiker).toHaveBeenCalledWith({ email: "hiker@example.com", password: "password1" });
    expect(mocks.createSession).toHaveBeenCalledWith("new-hiker");
  });

  it("surfaces duplicate account errors and does not create a session", async () => {
    mocks.createHiker.mockRejectedValue(new Error("An account with this email already exists."));
    expect(await signup({ email: "hiker@example.com", password: "password1" })).toEqual({
      success: false, error: "An account with this email already exists.",
    });
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("logs infrastructure errors without exposing database details to the UI", async () => {
    mocks.limit.mockRejectedValue(new Error("private database details"));
    expect(await login({ email: "hiker@example.com", password: "password1" })).toEqual({
      success: false, error: "Could not log in. Please try again later.",
    });
    expect(console.error).toHaveBeenCalled();
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("tells users to log in if signup succeeds but session creation fails", async () => {
    mocks.createSession.mockRejectedValue(new Error("session database unavailable"));
    expect(await signup({ email: "hiker@example.com", password: "password1" })).toEqual({
      success: false, error: "Your account was created, but we could not log you in. Please use the Login tab.",
    });
  });

  it("revokes the session before redirecting on logout", async () => {
    await logout();
    expect(mocks.deleteSession).toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });

  it("reports only whether a currently valid session exists", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "hiker-id", email: "hiker@example.com" });
    expect(await hasActiveSession()).toBe(false);
    expect(await hasActiveSession()).toBe(true);
  });
});
