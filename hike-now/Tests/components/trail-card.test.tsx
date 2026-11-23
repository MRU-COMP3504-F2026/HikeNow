
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TrailCard from "@/app/components/trail-card";
import { vi } from "vitest";

vi.mock("@/app/actions/trail-status", () => ({
  updateTrailStatus: vi.fn().mockResolvedValue(undefined),
}));

const props = {
  name: "Cedar Loop",
  location: "Alberta",
  imageUrl: "/cedar.jpg",
  rating: 4.5,
  lengthKm: 4.5,
  difficulty: "Easy",
  href: "/reviews/cedar",
  hikeId: "fjfoji294"
};

describe("TrailCard status dropdown", () => {
  it("shows 'Not started' by default", () => {
    render(<TrailCard {...props} isLoggedIn />);
    expect(screen.getByRole("button", { name: "Status of Cedar Loop" })).toHaveTextContent(
      "Not started",
    );
  });

  it("lets the user change the status of the card", () => {
    render(<TrailCard {...props} isLoggedIn />);
    const button = screen.getByRole("button", { name: "Status of Cedar Loop" });
    fireEvent.click(button);
    fireEvent.click(screen.getByRole("option", { name: "Completed" }));
    expect(button).toHaveTextContent("Completed");
  });
});
