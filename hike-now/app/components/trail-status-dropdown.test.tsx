import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TrailStatusDropdown, { TRAIL_STATUS_OPTIONS } from "./trail-status-dropdown";

describe("TrailStatusDropdown", () => {
  it("shows 'Not started' as the default status", () => {
    render(<TrailStatusDropdown onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Trail status" })).toHaveTextContent("Not started");
  });

  it("lists 'Withdrawn' and 'Completed' below 'Not started'", () => {
    render(<TrailStatusDropdown onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Trail status" }));
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Not started",
      "Withdrawn",
      "Completed",
    ]);
    expect(TRAIL_STATUS_OPTIONS).toHaveLength(3);
  });

  it("calls onChange with the option value", () => {
    const onChange = vi.fn();
    render(<TrailStatusDropdown onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Trail status" }));
    fireEvent.click(screen.getByRole("option", { name: "Completed" }));
    expect(onChange).toHaveBeenCalledWith("completed");
  });

  it("shows the current status", () => {
    render(<TrailStatusDropdown value="withdrawn" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Trail status" })).toHaveTextContent("Withdrawn");
  });
});
