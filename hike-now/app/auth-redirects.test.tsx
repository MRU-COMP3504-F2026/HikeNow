// @vitest-environment node
import { renderToReadableStream } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(), redirect: vi.fn(), getHikes: vi.fn(),
  getHikers: vi.fn(), getReviews: vi.fn(), getFollowing: vi.fn(),
  getChatData: vi.fn(), notFound: vi.fn(),
}));
vi.mock("@/app/lib/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: mocks.notFound }));
vi.mock("./actions/hikes", () => ({ getHikes: mocks.getHikes }));
vi.mock("./actions/hikers", () => ({ getHikers: mocks.getHikers }));
vi.mock("./actions/reviews", () => ({ getReviews: mocks.getReviews }));
vi.mock("./actions/follows", () => ({ getFollowing: mocks.getFollowing }));
vi.mock("./actions/chats", () => ({ getChatData: mocks.getChatData }));
vi.mock("./components/session-navbar", () => ({ default: () => null }));
vi.mock("./components/footer", () => ({ default: () => null }));
vi.mock("./components/chats-view", () => ({ default: () => <p>Chats ready</p> }));
vi.mock("./components/review-form", () => ({ default: () => <p>Review form ready</p> }));

import ChatsPage from "./chats/page";
import FeedPage from "./feed/page";
import NewReviewPage from "./reviews/new/page";
import LeaveReviewPage from "./reviews/[id]/new/page";
import ReviewsPage from "./reviews/page";

async function renderPage(element: React.ReactElement) {
  const errors: unknown[] = [];
  const stream = await renderToReadableStream(element, { onError: (error) => { errors.push(error); } });
  await stream.allReady;
  return { html: await new Response(stream).text(), errors };
}

const routes = [
  { name: "chats", page: () => <ChatsPage searchParams={Promise.resolve({})} />, content: "Chats ready" },
  { name: "following feed", page: () => <FeedPage />, content: "No activity yet" },
  {
    name: "trail-specific review form",
    page: () => <LeaveReviewPage params={Promise.resolve({ id: "trail-id" })} />,
    content: "Review form ready",
  },
];

beforeEach(() => {
  vi.resetAllMocks();
  mocks.redirect.mockImplementation(() => { throw new Error("NEXT_REDIRECT"); });
  mocks.notFound.mockImplementation(() => { throw new Error("NEXT_NOT_FOUND"); });
  mocks.getHikes.mockResolvedValue([{ id: "trail-id", name: "Trail", photo: null, equipment: null }]);
  mocks.getHikers.mockResolvedValue([]);
  mocks.getReviews.mockResolvedValue([]);
  mocks.getFollowing.mockResolvedValue([]);
  mocks.getChatData.mockImplementation(async () => {
    const user = await mocks.getCurrentUser();
    if (!user) mocks.redirect("/login");
    return { threads: [], contacts: [], trails: [], me: user };
  });
});

it.each([null, { id: "hiker-id" }])("redirects the general review form to reviews regardless of login (%j)", (user) => {
  mocks.getCurrentUser.mockResolvedValue(user);
  expect(() => NewReviewPage()).toThrow("NEXT_REDIRECT");
  expect(mocks.redirect).toHaveBeenCalledWith("/reviews");
  expect(mocks.getHikes).not.toHaveBeenCalled();
});

it("returns not found instead of reviewing a different trail for an invalid trail ID", async () => {
  mocks.getCurrentUser.mockResolvedValue({ id: "hiker-id" });
  const { html, errors } = await renderPage(<LeaveReviewPage params={Promise.resolve({ id: "missing-trail" })} />);
  expect(mocks.notFound).toHaveBeenCalled();
  expect(errors[0]).toMatchObject({ message: "NEXT_NOT_FOUND" });
  expect(html).not.toContain("Review form ready");
});

it("does not offer review creation on the general reviews page", async () => {
  const { html, errors } = await renderPage(await ReviewsPage());
  expect(errors).toEqual([]);
  expect(html).toContain("Latest Reviews");
  expect(html).not.toContain("Leave a review");
  expect(html).not.toContain('href="/reviews/new"');
});

describe.each(routes)("$name access", ({ page, content }) => {
  it("redirects signed-out visitors before loading protected content", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const { html, errors } = await renderPage(page());
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ message: "NEXT_REDIRECT" });
    expect(html).not.toContain(content);
    expect(mocks.getHikes).not.toHaveBeenCalled();
    expect(mocks.getFollowing).not.toHaveBeenCalled();
  });

  it("renders normally for a signed-in visitor", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "hiker-id", email: "hiker@example.com" });
    const { html, errors } = await renderPage(page());
    expect(html).toContain(content);
    expect(errors).toEqual([]);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
