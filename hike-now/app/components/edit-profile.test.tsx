import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import EditProfile from "./edit-profile";

const { updateProfile, refresh } = vi.hoisted(() => ({ updateProfile: vi.fn(), refresh: vi.fn() }));
vi.mock("@/app/actions/profile", () => ({ updateProfile }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

beforeEach(() => vi.resetAllMocks());

function renderEditor(profile = { displayName: "Alex Summit", bio: "I like ridges." }) {
  render(<EditProfile defaultName="Alex" initialProfile={profile} />);
  fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
}

it("prefills saved details, enforces limits, and cancels without saving", () => {
  renderEditor();
  expect(screen.getByLabelText("Name")).toHaveValue("Alex Summit");
  expect(screen.getByLabelText("Name")).toHaveAttribute("maxLength", "50");
  expect(screen.getByLabelText("Name")).toHaveAttribute("placeholder", "Alex");
  expect(screen.getByLabelText("Bio")).toHaveValue("I like ridges.");
  expect(screen.getByLabelText("Bio")).toHaveAttribute("maxLength", "500");
  expect(screen.getByText("14/500")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
  expect(updateProfile).not.toHaveBeenCalled();
});

it("saves the name and bio, refreshes the dashboard, and reopens with saved values", async () => {
  updateProfile.mockResolvedValue({ success: true, profile: { displayName: "Trail Alex", bio: "New bio" } });
  renderEditor({ displayName: null, bio: null });
  expect(screen.getByText("Leave blank to use Alex.")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: " Trail Alex " } });
  fireEvent.change(screen.getByLabelText("Bio"), { target: { value: "New bio" } });
  fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

  expect(await screen.findByRole("status")).toHaveTextContent("Profile saved.");
  expect(updateProfile).toHaveBeenCalledWith(" Trail Alex ", "New bio");
  expect(refresh).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
  expect(screen.getByLabelText("Name")).toHaveValue("Trail Alex");
  expect(screen.getByLabelText("Bio")).toHaveValue("New bio");
});

it("keeps edits open and shows server or network errors", async () => {
  updateProfile.mockResolvedValueOnce({ success: false, error: "Bios must be at most 500 characters." })
    .mockRejectedValueOnce(new Error("offline"));
  renderEditor();
  fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Bios must be at most 500 characters.");
  expect(screen.getByLabelText("Name")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
  expect(await screen.findByText("Could not save your profile. Please try again later.")).toBeInTheDocument();
  expect(refresh).not.toHaveBeenCalled();
});
