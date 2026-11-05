// @vitest-environment node
import { renderToReadableStream } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(), redirect: vi.fn(), getHikes: vi.fn(),
  getHikers: vi.fn(), getReviews: vi.fn(), getFollowing: vi.fn(),
}));
vi.mock("@/app/lib/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("./actions/hikes", () => ({ getHikes: mocks.getHikes }));
vi.mock("./actions/hikers", () => ({ getHikers: mocks.getHikers }));
vi.mock("./actions/reviews", () => ({ getReviews: mocks.getReviews }));
vi.mock("./actions/follows", () => ({ getFollowing: mocks.getFollowing }));
vi.mock("./components/session-navbar", () => ({ default: () => null }));
vi.mock("./components/footer", () => ({ default: () => null }));
vi.mock("./components/chats-view", () => ({ default: () => <p>Chats ready</p> }));
vi.mock("./components/review-form", () => ({ default: () => <p>Review form ready</p> }));

import ChatsPage from "./chats/page";
import FeedPage from "./feed/page";
import NewReviewPage from "./reviews/new/page";
import LeaveReviewPage from "./reviews/[id]/new/page";

async function renderPage(element: React.ReactElement) {
  const errors: unknown[] = [];
  const stream = await renderToReadableStream(element, { onError: (error) => { errors.push(error); } });
  await stream.allReady;
  return { html: await new Response(stream).text(), errors };
}

const routes = [
  { name: "chats", page: () => <ChatsPage />, content: "Chats ready" },
  { name: "following feed", page: () => <FeedPage />, content: "No activity yet" },
  { name: "review form", page: () => <NewReviewPage />, content: "Review form ready" },
  {
    name: "trail-specific review form",
    page: () => <LeaveReviewPage params={Promise.resolve({ id: "trail-id" })} />,
    content: "Review form ready",
  },
];

beforeEach(() => {
  vi.resetAllMocks();
  mocks.redirect.mockImplementation(() => { throw new Error("NEXT_REDIRECT"); });
  mocks.getHikes.mockResolvedValue([{ id: "trail-id", name: "Trail", photo: null, equipment: null }]);
  mocks.getHikers.mockResolvedValue([]);
  mocks.getReviews.mockResolvedValue([]);
  mocks.getFollowing.mockResolvedValue([]);
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
