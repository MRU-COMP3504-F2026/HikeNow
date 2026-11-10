import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FeaturedTrails, { type FeaturedTrail } from "./featured-trails";

const trails: FeaturedTrail[] = [
  {
    id: "cedar",
    name: "Cedar Loop",
    location: "Alberta",
    photo: null,
    photoCreditAuthor: null,
    photoCreditSource: null,
    photoCreditAuthorHref: null,
    photoCreditSourceHref: null,
    rating: "4.5",
    length: "4.5",
    difficulty: "Easy",
  },
  {
    id: "alpine",
    name: "Alpine Ridge",
    location: "Alberta",
    photo: null,
    photoCreditAuthor: null,
    photoCreditSource: null,
    photoCreditAuthorHref: null,
    photoCreditSourceHref: null,
    rating: "4.8",
    length: "12",
    difficulty: "High",
  },
  {
    id: "meadow",
    name: "Meadow Walk",
    location: "Alberta",
    photo: null,
    photoCreditAuthor: null,
    photoCreditSource: null,
    photoCreditAuthorHref: null,
    photoCreditSourceHref: null,
    rating: "4.2",
    length: "2",
    difficulty: "Moderate",
  },
];

function visibleTrailNames() {
  return screen
    .getAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent?.split(",")[0]);
}

describe("FeaturedTrails", () => {
  it("opens the filter menu from the icon button and sorts the displayed trails", () => {
    render(<FeaturedTrails trails={trails} />);

    const filterButton = screen.getByRole("button", { name: "Filter trails" });
    expect(visibleTrailNames()).toEqual(["Cedar Loop", "Alpine Ridge", "Meadow Walk"]);

    const sortOptions = [
      ["Difficulty (Low to High)", ["Cedar Loop", "Meadow Walk", "Alpine Ridge"]],
      ["Difficulty (High to Low)", ["Alpine Ridge", "Meadow Walk", "Cedar Loop"]],
      ["Length (Short to Long)", ["Meadow Walk", "Cedar Loop", "Alpine Ridge"]],
      ["Length (Long to Short)", ["Alpine Ridge", "Cedar Loop", "Meadow Walk"]],
      ["Name (A → Z)", ["Alpine Ridge", "Cedar Loop", "Meadow Walk"]],
      ["Name (Z → A)", ["Meadow Walk", "Cedar Loop", "Alpine Ridge"]],
    ] as const;

    for (const [optionName, expectedNames] of sortOptions) {
      fireEvent.click(filterButton);
      fireEvent.click(screen.getByRole("option", { name: optionName }));
      expect(visibleTrailNames()).toEqual(expectedNames);
      expect(filterButton).toHaveAttribute("aria-expanded", "false");
    }
  });
});
