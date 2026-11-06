import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks -----------------------------------------------------------------
// Sustituimos eq/and por objetos simples para poder comprobar las condiciones
// que construye cada endpoint sin necesitar una base de datos real.
vi.mock("drizzle-orm", async (importOriginal) => ({
  ...(await importOriginal<typeof import("drizzle-orm")>()),
  eq: (column: unknown, value: unknown) => ({ op: "eq", column, value }),
  and: (...conditions: unknown[]) => ({ op: "and", conditions }),
}));

const { db, revalidatePath, getCurrentUser, redirect } = vi.hoisted(() => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
  revalidatePath: vi.fn(),
  getCurrentUser: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/app/db", () => ({ db }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/app/lib/session", () => ({ getCurrentUser }));
vi.mock("next/navigation", () => ({ redirect }));

import { follow } from "@/app/db/schema";
import {
  followUser,
  getFollowers,
  getFollowing,
  getFollows,
  unfollowUser,
} from "./follows";

// --- Helpers ---------------------------------------------------------------
const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";

/** db.select().from(table) [.where(cond)] -> resolves to `rows`. */
function mockSelect(rows: unknown[]) {
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn(() => Object.assign(Promise.resolve(rows), { where }));
  db.select.mockReturnValue({ from });
  return { from, where };
}

beforeEach(() => {
  vi.resetAllMocks();
  getCurrentUser.mockResolvedValue({ id: A, email: "hiker@example.com" });
});

// --- Tests -----------------------------------------------------------------
describe("getFollows", () => {
  it("returns every follow relation", async () => {
    const rows = [
      { followerId: A, followeeId: B },
      { followerId: B, followeeId: A },
    ];
    const { from } = mockSelect(rows);

    await expect(getFollows()).resolves.toEqual(rows);
    expect(from).toHaveBeenCalledWith(follow);
  });

  it("returns an empty list when nobody follows anybody", async () => {
    mockSelect([]);
    await expect(getFollows()).resolves.toEqual([]);
  });
});

describe("getFollowers", () => {
  it("filters by followee_id and returns the followers", async () => {
    const rows = [{ followerId: A, followeeId: B }];
    const { from, where } = mockSelect(rows);

    await expect(getFollowers(B)).resolves.toEqual(rows);
    expect(from).toHaveBeenCalledWith(follow);
    expect(where).toHaveBeenCalledWith({
      op: "eq",
      column: follow.followeeId,
      value: B,
    });
  });
});

describe("getFollowing", () => {
  it("filters by follower_id and returns who the user follows", async () => {
    const rows = [{ followerId: A, followeeId: B }];
    const { from, where } = mockSelect(rows);

    await expect(getFollowing(A)).resolves.toEqual(rows);
    expect(from).toHaveBeenCalledWith(follow);
    expect(where).toHaveBeenCalledWith({
      op: "eq",
      column: follow.followerId,
      value: A,
    });
  });
});

describe("followUser", () => {
  function mockInsert(result: unknown[]) {
    const returning = vi.fn().mockResolvedValue(result);
    const onConflictDoNothing = vi.fn(() => ({ returning }));
    const values = vi.fn(() => ({ onConflictDoNothing }));
    db.insert.mockReturnValue({ values });
    return { values, returning };
  }

  it("inserts the relation and returns the new row", async () => {
    const row = { followerId: A, followeeId: B };
    const { values, returning } = mockInsert([row]);

    await expect(followUser(A, B)).resolves.toEqual(row);
    expect(db.insert).toHaveBeenCalledWith(follow);
    expect(values).toHaveBeenCalledWith({ followerId: A, followeeId: B });
    expect(returning).toHaveBeenCalled();
  });

  it("revalidates both hiker pages", async () => {
    mockInsert([{ followerId: A, followeeId: B }]);

    await followUser(A, B);

    expect(revalidatePath).toHaveBeenCalledTimes(4);
    expect(revalidatePath).toHaveBeenCalledWith(`/profile/${B}`);
    expect(revalidatePath).toHaveBeenCalledWith(`/profile/${A}`);
    expect(revalidatePath).toHaveBeenCalledWith("/feed");
    expect(revalidatePath).toHaveBeenCalledWith("/chats");
  });

  it("propagates database errors and does not revalidate", async () => {
    const returning = vi.fn().mockRejectedValue(new Error("duplicate key"));
    db.insert.mockReturnValue({ values: vi.fn(() => ({ onConflictDoNothing: () => ({ returning }) })) });

    await expect(followUser(A, B)).rejects.toThrow("duplicate key");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("treats an existing follow as success and rejects self-following", async () => {
    mockInsert([]);
    await expect(followUser(A, B)).resolves.toEqual({ followerId: A, followeeId: B });
    db.insert.mockClear();
    await expect(followUser(A, A)).rejects.toThrow("yourself");
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("redirects signed-out users and rejects attempts to act for another user", async () => {
    getCurrentUser.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: B });
    redirect.mockImplementation(() => { throw new Error("NEXT_REDIRECT"); });
    await expect(followUser(A, B)).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
    await expect(followUser(A, B)).rejects.toThrow("another user's follows");
    expect(db.insert).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("unfollowUser", () => {
  function mockDelete() {
    const where = vi.fn().mockResolvedValue(undefined);
    db.delete.mockReturnValue({ where });
    return { where };
  }

  it("deletes only the matching follower/followee pair", async () => {
    const { where } = mockDelete();

    await unfollowUser(A, B);

    expect(db.delete).toHaveBeenCalledWith(follow);
    expect(where).toHaveBeenCalledWith({
      op: "and",
      conditions: [
        { op: "eq", column: follow.followerId, value: A },
        { op: "eq", column: follow.followeeId, value: B },
      ],
    });
  });

  it("revalidates both hiker pages and returns nothing", async () => {
    mockDelete();

    await expect(unfollowUser(A, B)).resolves.toBeUndefined();
    expect(revalidatePath).toHaveBeenCalledTimes(4);
    expect(revalidatePath).toHaveBeenCalledWith(`/profile/${B}`);
    expect(revalidatePath).toHaveBeenCalledWith(`/profile/${A}`);
  });

  it("propagates database errors and does not revalidate", async () => {
    db.delete.mockReturnValue({
      where: vi.fn().mockRejectedValue(new Error("connection lost")),
    });

    await expect(unfollowUser(A, B)).rejects.toThrow("connection lost");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("redirects signed-out users and rejects attempts to act for another user", async () => {
    getCurrentUser.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: B });
    redirect.mockImplementation(() => { throw new Error("NEXT_REDIRECT"); });
    await expect(unfollowUser(A, B)).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
    await expect(unfollowUser(A, B)).rejects.toThrow("another user's follows");
    expect(db.delete).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
