import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Navbar from "./navbar";

const { usePathname } = vi.hoisted(() => ({
  usePathname: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname,
}));
vi.mock("@/app/actions/auth", () => ({ logout: vi.fn() }));

vi.mock("next/link", () => ({
  default: ({
    children,
    ...props
  }: React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement>>) => (
    <a {...props}>{children}</a>
  ),
}));

describe("Navbar", () => {
  beforeEach(() => {
    usePathname.mockReturnValue("/reviews");
  });

  it("renders the brand, primary links, and login action for signed-out users", () => {
    render(<Navbar />);

    expect(screen.getByRole("link", { name: "Hike Now!" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "Trails" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "Reviews" })).toHaveClass(
      "text-primary",
    );
    expect(screen.getByRole("link", { name: "Chats" })).toHaveAttribute(
      "href",
      "/chats",
    );
    expect(screen.getAllByRole("link", { name: "Login" })).toHaveLength(1);
  });

  it("shows the signed-in user instead of the login action", () => {
    render(<Navbar user={{ id: "u1", email: "hiker@example.com" }} />);

    expect(screen.getAllByText("hiker@example.com")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Login" })).not.toBeInTheDocument();
  });

  it("links the signed-in user to their profile", () => {
    render(<Navbar user={{ id: "u1", email: "hiker@example.com" }} />);

    expect(screen.getByRole("link", { name: /My profile/ })).toHaveAttribute("href", "/profile/u1");
  });

  it("links to the signed-in profile from the mobile menu and closes it", () => {
    render(<Navbar user={{ id: "u1", email: "hiker@example.com" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

    const mobileMenu = screen.getByRole("navigation", { name: "Mobile" });
    const profileLink = within(mobileMenu).getByRole("link", { name: "My profile (hiker@example.com)" });
    expect(profileLink).toHaveAttribute("href", "/profile/u1");
    profileLink.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(profileLink);
    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();
  });

  it("submits the search box to /search with the query", () => {
    render(<Navbar />);

    const form = screen.getByRole("search");
    expect(form).toHaveAttribute("action", "/search");
    expect(form).toHaveAttribute("method", "get");
    expect(screen.getAllByLabelText("Search")[0]).toHaveAttribute("name", "q");
  });

  it("opens and closes the mobile navigation", () => {
    render(<Navbar />);

    const menuButton = screen.getByRole("button", { name: "Open menu" });
    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();

    fireEvent.click(menuButton);
    expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("navigation", { name: "Mobile" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close menu" }));
    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();
  });
});
