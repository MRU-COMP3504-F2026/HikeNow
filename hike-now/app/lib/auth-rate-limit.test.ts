// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(), values: vi.fn(), upsert: vi.fn(), returning: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/app/db", () => ({ db: { insert: mocks.insert } }));
import { AuthRateLimitError, checkAuthRateLimit } from "./auth-rate-limit";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.insert.mockReturnValue({ values: mocks.values });
  mocks.values.mockReturnValue({ onConflictDoUpdate: mocks.upsert });
  mocks.upsert.mockReturnValue({ returning: mocks.returning });
});

it("allows exactly ten attempts", async () => {
  mocks.returning.mockResolvedValue([{ attempts: 10 }]);
  await expect(checkAuthRateLimit("hiker@example.com")).resolves.toBeUndefined();
  expect(mocks.values.mock.calls[0][0].key).toMatch(/^[a-f0-9]{64}$/);
  expect(mocks.values.mock.calls[0][0].attempts).toBe(1);
  expect(mocks.upsert).toHaveBeenCalled();
});

it("rejects the eleventh attempt with an explicit error", async () => {
  mocks.returning.mockResolvedValue([{ attempts: 11 }]);
  await expect(checkAuthRateLimit("hiker@example.com")).rejects.toBeInstanceOf(AuthRateLimitError);
});

it("propagates storage failures rather than silently allowing login", async () => {
  mocks.returning.mockRejectedValue(new Error("rate-limit store unavailable"));
  await expect(checkAuthRateLimit("hiker@example.com")).rejects.toThrow("rate-limit store unavailable");
});
