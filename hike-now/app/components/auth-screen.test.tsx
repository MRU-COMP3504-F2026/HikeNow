import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import AuthScreen from "./auth-screen";

const { login, signup, replace, refresh } = vi.hoisted(() => ({
  login: vi.fn(), signup: vi.fn(), replace: vi.fn(), refresh: vi.fn(),
}));
vi.mock("@/app/actions/auth", () => ({ login, signup }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }) }));

beforeEach(() => {
  vi.resetAllMocks();
});

it("calls login and navigates after success", async () => {
  login.mockResolvedValue({ success: true });
  render(<AuthScreen />);
  fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: "hiker@example.com" } });
  fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: "password1" } });
  fireEvent.click(screen.getByRole("button", { name: "Login" }));
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  expect(login).toHaveBeenCalledWith({ email: "hiker@example.com", password: "password1" });
  expect(refresh).toHaveBeenCalled();
});

it("shows server credential failures without navigating", async () => {
  login.mockResolvedValue({ success: false, error: "Invalid email or password." });
  render(<AuthScreen />);
  fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: "hiker@example.com" } });
  fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: "wrong" } });
  fireEvent.click(screen.getByRole("button", { name: "Login" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password.");
  expect(replace).not.toHaveBeenCalled();
});

it("calls signup from the account creation tab", async () => {
  signup.mockResolvedValue({ success: true });
  render(<AuthScreen />);
  fireEvent.click(screen.getByRole("tab", { name: "Sign up" }));
  fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: "new@example.com" } });
  fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: "password1" } });
  fireEvent.change(screen.getByLabelText(/^Confirm password/), { target: { value: "password1" } });
  fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  expect(signup).toHaveBeenCalledWith({ email: "new@example.com", password: "password1" });
});
