import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FollowButton from "./follow-button";

const { hasActiveSession, push } = vi.hoisted(() => ({ hasActiveSession: vi.fn(), push: vi.fn() }));
vi.mock("@/app/actions/auth", () => ({ hasActiveSession }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

beforeEach(() => {
  vi.resetAllMocks();
  hasActiveSession.mockResolvedValue(true);
});

describe("FollowButton", () => {
  it("shows Follow and switches to Following after clicking", async () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    render(<FollowButton name="Alex" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Follow Alex" }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(true));

    const button = await screen.findByRole("button", { name: "Unfollow Alex" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveTextContent("Following");
  });

  it("starts as Following with initialFollowing", () => {
    render(<FollowButton name="Alex" initialFollowing />);
    expect(screen.getByRole("button", { name: "Unfollow Alex" })).toBeInTheDocument();
  });

  it("is disabled while the request is pending and reverts on error", async () => {
    let reject!: (e: Error) => void;
    const onChange = vi.fn(() => new Promise<void>((_, r) => (reject = r)));
    render(<FollowButton name="Alex" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Follow Alex" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Unfollow Alex" })).toBeDisabled());

    reject(new Error("fail"));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Follow Alex" })).toBeEnabled(),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Could not update the follow status");
  });

  it("redirects signed-out or expired sessions without changing follow state", async () => {
    hasActiveSession.mockResolvedValue(false);
    const onChange = vi.fn();
    render(<FollowButton name="Alex" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Follow Alex" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Follow Alex" })).toHaveAttribute("aria-pressed", "false");
  });

  it("surfaces session-check failures rather than following or redirecting", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    hasActiveSession.mockRejectedValue(new Error("network"));
    const onChange = vi.fn();
    render(<FollowButton name="Alex" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Follow Alex" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not complete this action");
    expect(push).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });
});
