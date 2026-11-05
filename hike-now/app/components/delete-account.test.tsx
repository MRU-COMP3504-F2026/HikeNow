import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import DeleteAccount from "./delete-account";

const { deleteAccount } = vi.hoisted(() => ({ deleteAccount: vi.fn() }));
vi.mock("@/app/actions/account", () => ({ deleteAccount }));

beforeEach(() => vi.resetAllMocks());

it("requires explicit confirmation and allows cancellation without deleting", () => {
  render(<DeleteAccount />);
  expect(screen.queryByLabelText("Confirm your current password")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
  expect(screen.getByLabelText("Confirm your current password")).toHaveAttribute("type", "password");
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("button", { name: "Permanently delete account" })).not.toBeInTheDocument();
  expect(deleteAccount).not.toHaveBeenCalled();
});

it("displays server errors without claiming that the account was deleted", async () => {
  deleteAccount.mockResolvedValue({ success: false, error: "Incorrect password. Your account was not deleted." });
  render(<DeleteAccount />);
  fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
  fireEvent.change(screen.getByLabelText("Confirm your current password"), { target: { value: "wrong" } });
  fireEvent.click(screen.getByRole("button", { name: "Permanently delete account" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Your account was not deleted.");
  expect(deleteAccount).toHaveBeenCalledWith("wrong");
});
