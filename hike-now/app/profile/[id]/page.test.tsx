// @vitest-environment node
import { renderToReadableStream } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getHikerById: vi.fn(),
  getHikers: vi.fn(),
  getReviews: vi.fn(),
  getHikes: vi.fn(),
  getCurrentUser: vi.fn(),
  getFollowers: vi.fn(),
  getFollowing: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock("../../actions/hikers", () => ({
  getHikerById: mocks.getHikerById,
  getHikers: mocks.getHikers,
}));
vi.mock("../../actions/reviews", () => ({ getReviews: mocks.getReviews }));
vi.mock("../../actions/hikes", () => ({ getHikes: mocks.getHikes }));
vi.mock("../../actions/follows", () => ({
  getFollowers: mocks.getFollowers,
  getFollowing: mocks.getFollowing,
}));
vi.mock("../../lib/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("../../components/session-navbar", () => ({ default: () => null }));
vi.mock("../../components/footer", () => ({ default: () => null }));
vi.mock("../../components/delete-account", () => ({ default: () => <button>Delete account</button> }));
vi.mock("../../components/edit-profile", () => ({
  default: ({ defaultName, initialProfile }: { defaultName: string; initialProfile: { displayName: string | null; bio: string | null } }) =>
    <button data-default-name={defaultName} data-name={initialProfile.displayName ?? ""} data-bio={initialProfile.bio ?? ""}>Edit profile</button>,
}));
vi.mock("../../components/follow-button", () => ({
  default: ({ name }: { name: string }) => <button>{`Follow ${name}`}</button>,
}));

import ProfilePage, { generateStaticParams } from "./page";

async function renderProfile(id: string) {
  const errors: unknown[] = [];
  const stream = await renderToReadableStream(
    <ProfilePage params={Promise.resolve({ id })} />,
    { onError: (error) => { errors.push(error); } },
  );
  await stream.allReady;
  return { html: await new Response(stream).text(), errors };
}

beforeEach(() => {
  vi.resetAllMocks();
  const hiker = {
    id: "hiker-id",
    email: "alex@example.com",
    description: "I like mountains.",
    joinedAt: "2024-01-02T00:00:00.000Z",
  };
  mocks.getHikerById.mockResolvedValue(hiker);
  mocks.getHikers.mockResolvedValue([hiker, { id: "another-hiker" }]);
  mocks.getCurrentUser.mockResolvedValue({ id: hiker.id, email: hiker.email });
  mocks.getHikes.mockResolvedValue([{ id: "trail-id", name: "Mountain Trail" }]);
  mocks.getReviews.mockResolvedValue([
  {
    id: "older-review",
    hikerId: hiker.id,
    hikeId: "trail-id",

    // Submitted later, but the hike itself happened earlier.
    createdAt: "2025-04-01T00:00:00.000Z",
    hikeDate: "2025-02-01",

    title: "Older review",
    rating: "4",
    condition: "good",
    tags: "",
    comments: "",
  },
  {
    id: "newer-review",
    hikerId: hiker.id,
    hikeId: "trail-id",

    // Submitted earlier, but the hike itself happened later.
    createdAt: "2025-01-01T00:00:00.000Z",
    hikeDate: "2025-03-01",

    title: "Newer review",
    rating: "5",
    condition: "mild",
    tags: "",
    comments: "",
  },
  {
    id: "other-review",
    hikerId: "another-hiker",
    hikeId: "trail-id",
    createdAt: "2025-04-01T00:00:00.000Z",
    hikeDate: "2025-04-01",

    title: "Different author review",
    rating: "3",
    condition: "bad",
    tags: "",
    comments: "",
  },
]);
  mocks.getFollowers.mockResolvedValue([{ id: "follower-1" }, { id: "follower-2" }]);
  mocks.getFollowing.mockResolvedValue([{ id: "following-1" }]);
  mocks.notFound.mockImplementation(() => { throw new Error("NEXT_NOT_FOUND"); });
});

describe("profile page", () => {
  it("renders the owner's dashboard and their reviews in date order", async () => {
    const { html, errors } = await renderProfile("hiker-id");

    expect(errors).toEqual([]);
    expect(mocks.getHikerById).toHaveBeenCalledWith("hiker-id");
    expect(mocks.getHikers).not.toHaveBeenCalled();
    expect(mocks.getFollowers).toHaveBeenCalledWith("hiker-id");
    expect(mocks.getFollowing).toHaveBeenCalledWith("hiker-id");
    expect(html).toContain("Your dashboard");
    expect(html).toContain("January 2, 2024");
    expect(html).toContain("Mar 1, 2025");
    expect(html).toContain("Feb 1, 2025");
    expect(html).toMatch(/Reviews<\/dt><dd[^>]*>2<\/dd>/);
    expect(html).toMatch(/Trails reviewed<\/dt><dd[^>]*>1<\/dd>/);
    expect(html).toMatch(/Followers<\/dt><dd[^>]*>2<\/dd>/);
    expect(html).toMatch(/Following<\/dt><dd[^>]*>1<\/dd>/);
    expect(html).toContain('href="/reviews/trail-id"');
    expect(html).toContain("Newer review");
    expect(html).toContain("Older review");
    expect(html.indexOf("Newer review")).toBeLessThan(html.indexOf("Older review"));
    expect(html).not.toContain("Different author review");
    expect(html).toContain("Delete account");
    expect(html).toContain('data-default-name="Alex"');
    expect(html).toContain('data-bio="I like mountains."');
    expect(html).not.toContain("Follow Alex");
  });

  it("shows a chosen name instead of the email-derived name", async () => {
    mocks.getHikerById.mockResolvedValue({
      id: "hiker-id", email: "alex@example.com", displayName: "Alex Summit",
      description: "Line one\nLine two", joinedAt: null,
    });
    mocks.getCurrentUser.mockResolvedValue({ id: "another-hiker", email: "other@example.com" });
    const { html, errors } = await renderProfile("hiker-id");

    expect(errors).toEqual([]);
    expect(html).toContain("Alex Summit</h1>");
    expect(html).toContain("Follow Alex Summit");
    expect(html).toContain("Line one\nLine two");
    expect(html).not.toContain("Edit profile");
  });

  it.each([
    { name: "a signed-out visitor", user: null },
    { name: "another signed-in user", user: { id: "another-hiker", email: "other@example.com" } },
  ])("shows the follow action to $name without account controls", async ({ user }) => {
    mocks.getCurrentUser.mockResolvedValue(user);
    const { html, errors } = await renderProfile("hiker-id");

    expect(errors).toEqual([]);
    expect(html).toContain("Follow Alex");
    expect(html).not.toContain("Your dashboard");
    expect(html).not.toContain("Delete account");
    expect(html).not.toContain("Edit profile");
  });

  it("returns not found for a missing profile without loading follow counts", async () => {
    mocks.getHikerById.mockResolvedValue(null);
    const { errors } = await renderProfile("missing-id");

    expect(mocks.notFound).toHaveBeenCalledOnce();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ message: "NEXT_NOT_FOUND" });
    expect(mocks.getFollowers).not.toHaveBeenCalled();
    expect(mocks.getFollowing).not.toHaveBeenCalled();
  });

  it("generates static params for known hikers", async () => {
    expect(await generateStaticParams()).toEqual([
      { id: "hiker-id" },
      { id: "another-hiker" },
    ]);
  });
});
