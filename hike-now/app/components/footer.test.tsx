import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Footer from "./footer";

vi.mock("next/link", () => ({
  default: ({
    children,
    ...props
  }: React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement>>) => (
    <a {...props}>{children}</a>
  ),
}));

describe("Footer", () => {
  it("renders the brand, social links, and shared navigation links", () => {
    render(<Footer />);

    expect(screen.getByText("Hike Now!")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Facebook" })).toHaveAttribute(
      "href",
      "#",
    );
    expect(screen.getByRole("link", { name: "LinkedIn" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "YouTube" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Instagram" })).toBeInTheDocument();

    const footerNavigation = screen.getByRole("navigation", { name: "Footer" });
    expect(footerNavigation).toHaveTextContent("Trails");
    expect(footerNavigation).toHaveTextContent("Reviews");
    expect(footerNavigation).toHaveTextContent("Chats");
  });
});
