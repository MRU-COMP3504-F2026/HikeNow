// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(), createClient: vi.fn(), insert: vi.fn(), values: vi.fn(),
  returning: vi.fn(), select: vi.fn(), where: vi.fn(), update: vi.fn(), delete: vi.fn(), execute: vi.fn(),
  revalidatePath: vi.fn(), revalidateTag: vi.fn(),
  redirect: vi.fn(),
}));
vi.mock("@/app/db", () => ({ db: { insert: mocks.insert, select: mocks.select, update: mocks.update, delete: mocks.delete, execute: mocks.execute } }));
vi.mock("@/app/lib/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/app/db/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({
  unstable_cache: (callback: () => unknown) => callback,
  revalidatePath: mocks.revalidatePath, revalidateTag: mocks.revalidateTag,
}));
import { createReview, createReviewPhotoUpload, updateReview, deleteReview, getReviews, getReviewById } from "./reviews";

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

  it("redirects signed-out writes before database or storage access", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.redirect.mockImplementation(() => { throw new Error("NEXT_REDIRECT"); });
    await expect(createReview(form())).rejects.toThrow("NEXT_REDIRECT");
    await expect(updateReview("review-id", form())).rejects.toThrow("NEXT_REDIRECT");
    await expect(deleteReview("review-id")).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledTimes(3);
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("reports a session lookup failure without redirecting or exposing details", async () => {
    mocks.getCurrentUser.mockRejectedValue(new Error("private connection details"));
    expect(await createReview(form())).toEqual({ success: false, error: "Could not save your review. Please try again later." });
    expect(console.error).toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
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

describe("review photos", () => {
  const ownPath = "reviews/session-author/0b9f8e1c-2d3a-4b5c-8d7e-6f5a4b3c2d1e.jpg";
  const storage = {
    createSignedUploadUrl: vi.fn(),
    getPublicUrl: vi.fn(),
  };

  beforeEach(() => {
    mocks.createClient.mockResolvedValue({ storage: { from: () => storage } });
    storage.createSignedUploadUrl.mockImplementation(async (path: string) => ({ data: { path, token: "signed-token" }, error: null }));
    storage.getPublicUrl.mockImplementation((path: string) => ({ data: { publicUrl: `https://cdn.test/hike-reviews/${path}` } }));
  });

  it("signs uploads into the session hiker's folder and rejects invalid files", async () => {
    const signed = await createReviewPhotoUpload({ type: "image/jpeg", size: 1024 });
    expect(signed).toMatchObject({ success: true, token: "signed-token" });
    expect(signed.success && signed.path).toMatch(/^reviews\/session-author\/[a-f0-9-]{36}\.jpg$/);
    expect(await createReviewPhotoUpload({ type: "application/pdf", size: 1024 })).toHaveProperty("success", false);
    expect(await createReviewPhotoUpload({ type: "image/png", size: 7 * 1024 * 1024 })).toHaveProperty("success", false);
    expect(storage.createSignedUploadUrl).toHaveBeenCalledTimes(1);
  });

  it("stores the public URL of an uploaded photo", async () => {
    mocks.execute.mockResolvedValue([{ "?column?": 1 }]);
    const data = form();
    data.set("photoPath", ownPath);
    expect(await createReview(data)).toHaveProperty("success", true);
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({ photo: `https://cdn.test/hike-reviews/${ownPath}` }));
  });

  it("rejects photo paths owned by other hikers or missing from storage", async () => {
    const forged = form();
    forged.set("photoPath", ownPath.replace("session-author", "other-hiker"));
    expect(await createReview(forged)).toHaveProperty("success", false);

    mocks.execute.mockResolvedValue([]);
    const missing = form();
    missing.set("photoPath", ownPath);
    expect(await createReview(missing)).toHaveProperty("success", false);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
