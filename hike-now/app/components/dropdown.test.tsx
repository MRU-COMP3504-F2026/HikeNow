import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Dropdown from "./dropdown";
import TrailFilterDropdown, { TRAIL_FILTER_OPTIONS } from "./trail-filter-dropdown";

describe("Dropdown", () => {
  const options = [
    { value: "a", label: "Option A" },
    { value: "b", label: "Option B" },
  ];

  it("shows the placeholder and keeps the list closed by default", () => {
    render(<Dropdown options={options} onChange={() => {}} placeholder="Pick" />);
    expect(screen.getByRole("button", { name: "Options" })).toHaveTextContent("Pick");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens, selects an option, and closes", () => {
    const onChange = vi.fn();
    render(<Dropdown options={options} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Options" }));
    expect(screen.getAllByRole("option")).toHaveLength(2);
    fireEvent.click(screen.getByRole("option", { name: "Option B" }));
    expect(onChange).toHaveBeenCalledWith("b");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("marks the current value as selected and shows its label", () => {
    render(<Dropdown options={options} value="a" onChange={() => {}} />);
    const button = screen.getByRole("button", { name: "Options" });
    expect(button).toHaveTextContent("Option A");
    fireEvent.click(button);
    expect(screen.getByRole("option", { name: "Option A" })).toHaveAttribute("aria-selected", "true");
  });

  it("supports keyboard navigation and Escape", () => {
    const onChange = vi.fn();
    render(<Dropdown options={options} onChange={onChange} />);
    const button = screen.getByRole("button", { name: "Options" });
    fireEvent.keyDown(button, { key: "ArrowDown" });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(button, { key: "ArrowDown" });
    fireEvent.keyDown(button, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("b");
    fireEvent.keyDown(button, { key: "ArrowDown" });
    fireEvent.keyDown(button, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes when clicking outside", () => {
    render(<Dropdown options={options} onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Options" }));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});

describe("TrailFilterDropdown", () => {
  it("displays the 6 filter options from the prototype", () => {
    render(<TrailFilterDropdown onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Filter trails" }));
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Difficulty (Low to High)",
      "Difficulty (High to Low)",
      "Length (Short to Long)",
      "Length (Long to Short)",
      "Name (A → Z)",
      "Name (Z → A)",
    ]);
    expect(TRAIL_FILTER_OPTIONS).toHaveLength(6);
  });

  it("calls onChange with the option value", () => {
    const onChange = vi.fn();
    render(<TrailFilterDropdown onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Filter trails" }));
    fireEvent.click(screen.getByRole("option", { name: "Length (Long to Short)" }));
    expect(onChange).toHaveBeenCalledWith("length-desc");
  });
});
