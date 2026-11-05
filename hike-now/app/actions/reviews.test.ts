// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(), createClient: vi.fn(), insert: vi.fn(), values: vi.fn(),
  returning: vi.fn(), select: vi.fn(), where: vi.fn(), update: vi.fn(), delete: vi.fn(),
  revalidatePath: vi.fn(), revalidateTag: vi.fn(),
}));
vi.mock("@/app/db", () => ({ db: { insert: mocks.insert, select: mocks.select, update: mocks.update, delete: mocks.delete } }));
vi.mock("@/app/lib/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/app/db/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/cache", () => ({
  unstable_cache: (callback: () => unknown) => callback,
  revalidatePath: mocks.revalidatePath, revalidateTag: mocks.revalidateTag,
}));
import { createReview, updateReview, deleteReview, getReviews, getReviewById } from "./reviews";

function form() {
  const data = new FormData();
  Object.entries({
    hikeId: "11111111-1111-4111-8111-111111111111",
    hikerId: "forged-author", title: "Great hike", rating: "5", condition: "good",
    tags: "Clear", comments: "Loved the views.",
  }).forEach(([key, value]) => data.set(key, value));
  return data;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getCurrentUser.mockResolvedValue({ id: "session-author", email: "hiker@example.com" });
  mocks.insert.mockReturnValue({ values: mocks.values });
  mocks.values.mockReturnValue({ returning: mocks.returning });
  mocks.returning.mockResolvedValue([{ id: "review-id", hikerId: "session-author" }]);
  mocks.select.mockReturnValue({ from: () => ({ where: mocks.where }) });
  mocks.where.mockResolvedValue([]);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("review ownership", () => {
  it("uses the session owner, ignores a forged author, and refreshes profile history", async () => {
    expect(await createReview(form())).toHaveProperty("success", true);
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({ hikerId: "session-author" }));
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/profile/session-author");
    expect(mocks.revalidateTag).toHaveBeenCalledWith("reviews", { expire: 0 });
  });

  it("returns ISO review dates consistently before and after cache serialization", async () => {
    const rows = [
      { id: "dated-review", createdAt: new Date("2026-11-05T22:00:00Z") },
      { id: "legacy-review", createdAt: null },
    ];
    mocks.select.mockReturnValue({ from: () => ({
      orderBy: vi.fn().mockResolvedValue(rows),
      where: vi.fn().mockResolvedValue([rows[0]]),
    }) });
    const all = await getReviews();
    expect(all[0].createdAt).toBe("2026-11-05T22:00:00.000Z");
    expect(all[1].createdAt).toBeNull();
    expect(JSON.parse(JSON.stringify(all))).toEqual(all);
    const single = await getReviewById("dated-review");
    expect(single).toEqual(all[0]);
    expect(JSON.parse(JSON.stringify(single))).toEqual(single);
  });

  it("rejects signed-out writes before database or storage access", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect(await createReview(form())).toEqual({ success: false, error: "Please log in to write a review." });
    await expect(updateReview("review-id", form())).rejects.toThrow("log in");
    await expect(deleteReview("review-id")).rejects.toThrow("log in");
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rejects invalid ratings, empty titles, invalid trails, and invalid conditions", async () => {
    for (const [field, value] of [["rating", "6"], ["title", " "], ["hikeId", "invalid"], ["condition", "unknown"]]) {
      const data = form();
      data.set(field, value);
      expect(await createReview(data)).toHaveProperty("success", false);
    }
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("does not report success or invalidate caches after a failed insert", async () => {
    mocks.returning.mockRejectedValue(new Error("private connection details"));
    expect(await createReview(form())).toEqual({ success: false, error: "Could not save your review. Please try again later." });
    expect(console.error).toHaveBeenCalled();
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });

  it("prevents modification or deletion when the ownership query does not match", async () => {
    await expect(updateReview("someone-elses-review", form())).rejects.toThrow("not owned by you");
    await expect(deleteReview("someone-elses-review")).rejects.toThrow("not owned by you");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.delete).not.toHaveBeenCalled();
  });
});
