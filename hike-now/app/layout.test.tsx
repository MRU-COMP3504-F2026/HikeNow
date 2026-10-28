import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RootLayout, { metadata } from "./layout";

vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "font-inter" }),
}));

describe("RootLayout", () => {
  it("provides the application metadata and renders page content", () => {
    render(
      <RootLayout params={Promise.resolve({})}>
        <main>Trail details</main>
      </RootLayout>,
    );

    expect(metadata).toEqual({
      title: "Hike Now",
      description: "Discover and review hiking trails",
    });
    expect(document.documentElement).toHaveAttribute("lang", "en");
    expect(screen.getByRole("main")).toHaveTextContent("Trail details");
  });
});
