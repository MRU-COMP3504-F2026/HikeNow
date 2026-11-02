import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FollowButton from "./follow-button";

describe("FollowButton", () => {
  it("shows Follow and switches to Following after clicking", async () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    render(<FollowButton name="Alex" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Follow Alex" }));
    expect(onChange).toHaveBeenCalledWith(true);

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
    expect(screen.getByRole("button", { name: "Unfollow Alex" })).toBeDisabled();

    reject(new Error("fail"));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Follow Alex" })).toBeEnabled(),
    );
  });
});
