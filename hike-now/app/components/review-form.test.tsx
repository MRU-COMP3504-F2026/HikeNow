import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import ReviewForm from "./review-form";

const { createReview, createReviewPhotoUpload, uploadToSignedUrl } = vi.hoisted(() => ({
  createReview: vi.fn(), createReviewPhotoUpload: vi.fn(), uploadToSignedUrl: vi.fn(),
}));
vi.mock("../actions/reviews", () => ({ createReview, createReviewPhotoUpload }));
vi.mock("@supabase/ssr", () => ({
  createBrowserClient: () => ({ storage: { from: () => ({ uploadToSignedUrl }) } }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({ default: "a" }));

beforeEach(() => {
  vi.resetAllMocks();
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});

function completeForm(photo?: File) {
  const { container } = render(<ReviewForm trails={[{ id: "trail-id", name: "Test trail", photo: "/trail.jpg", equipment: "" }]} initialTrailId="trail-id" />);
  if (photo) fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [photo] } });
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

it("uploads the photo to a signed Supabase URL and submits only its storage path", async () => {
  const photo = new File(["jpeg"], "trail.jpg", { type: "image/jpeg" });
  createReviewPhotoUpload.mockResolvedValue({ success: true, path: "reviews/me/photo.jpg", token: "signed-token" });
  uploadToSignedUrl.mockResolvedValue({ data: { path: "reviews/me/photo.jpg" }, error: null });
  createReview.mockResolvedValue({ success: true });
  completeForm(photo);
  expect(await screen.findByText("Saved!")).toBeInTheDocument();
  expect(createReviewPhotoUpload).toHaveBeenCalledWith({ type: "image/jpeg", size: photo.size });
  expect(uploadToSignedUrl).toHaveBeenCalledWith("reviews/me/photo.jpg", "signed-token", photo, { contentType: "image/jpeg" });
  const data = createReview.mock.calls[0][0] as FormData;
  expect(data.get("photoPath")).toBe("reviews/me/photo.jpg");
  expect(data.has("photo")).toBe(false);
});

it("does not save the review when the photo upload fails", async () => {
  createReviewPhotoUpload.mockResolvedValue({ success: true, path: "reviews/me/photo.jpg", token: "signed-token" });
  uploadToSignedUrl.mockResolvedValue({ data: null, error: new Error("network") });
  vi.spyOn(console, "error").mockImplementation(() => {});
  completeForm(new File(["jpeg"], "trail.jpg", { type: "image/jpeg" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not upload your photo");
  expect(createReview).not.toHaveBeenCalled();
});
