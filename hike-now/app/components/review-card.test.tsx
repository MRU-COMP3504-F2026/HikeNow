import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ReviewCard from "./review-card";

vi.mock("next/link", () => ({
  default: ({
    children,
    ...props
  }: React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement>>) => (
    <a {...props}>{children}</a>
  ),
}));

describe("ReviewCard author", () => {
  it("links the author to their profile when authorHref is given", () => {
    render(<ReviewCard rating={4} title="Nice" author="alex" authorHref="/profile/u1" />);
    expect(screen.getByRole("link", { name: "alex" })).toHaveAttribute("href", "/profile/u1");
  });

  it("shows plain text without authorHref", () => {
    render(<ReviewCard rating={4} title="Nice" author="alex" />);
    expect(screen.getByText("alex")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "alex" })).not.toBeInTheDocument();
  });
});
