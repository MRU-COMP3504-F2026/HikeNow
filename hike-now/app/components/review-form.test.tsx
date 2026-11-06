import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import ReviewForm from "./review-form";

const { createReview } = vi.hoisted(() => ({ createReview: vi.fn() }));
vi.mock("../actions/reviews", () => ({ createReview }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({ default: "a" }));

beforeEach(() => vi.resetAllMocks());

function completeForm() {
  render(<ReviewForm trails={[{ id: "trail-id", name: "Test trail", photo: "/trail.jpg", equipment: "" }]} initialTrailId="trail-id" />);
  fireEvent.change(screen.getByLabelText(/Title/), { target: { value: "Great hike" } });
  fireEvent.click(screen.getByRole("radio", { name: "Good" }));
  fireEvent.click(screen.getByRole("button", { name: "Rate 5 out of 5 stars" }));
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
}

it("shows an error rather than the saved dialog when the server rejects a review", async () => {
  createReview.mockResolvedValue({ success: false, error: "Please log in to write a review." });
  completeForm();
  expect(await screen.findByRole("alert")).toHaveTextContent("Please log in");
  expect(screen.queryByText("Saved!")).not.toBeInTheDocument();
  const data = createReview.mock.calls[0][0] as FormData;
  expect(data.has("hikerId")).toBe(false);
});

it("shows the saved confirmation only after a successful response", async () => {
  createReview.mockResolvedValue({ success: true });
  completeForm();
  expect(await screen.findByText("Saved!")).toBeInTheDocument();
});
