import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AuthTabs from "./auth-tabs";
import FormField from "./form-field";
import LoginForm from "./login-form";
import PasswordField from "./password-field";
import SignupForm from "./signup-form";
import Tabs from "./tabs";

function type(label: string | RegExp, value: string) {
  // Las etiquetas de campos obligatorios terminan en " *", así que se busca por prefijo.
  const matcher = typeof label === "string" ? new RegExp(`^${label}`) : label;
  fireEvent.change(screen.getByLabelText(matcher), { target: { value } });
}

describe("FormField", () => {
  it("links the label to the input and marks required fields", () => {
    render(<FormField label="Email" required />);
    const input = screen.getByLabelText(/Email/);
    expect(input).toBeRequired();
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("shows an error, marks the input invalid and describes it", () => {
    render(<FormField label="Email" error="Please enter your email." hint="ignored" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Please enter your email.");
    expect(input).toHaveAccessibleDescription("Please enter your email.");
    expect(screen.queryByText("ignored")).not.toBeInTheDocument();
  });

  it("shows the hint when there is no error", () => {
    render(<FormField label="Name" hint="Your public name" />);
    expect(screen.getByLabelText("Name")).toHaveAccessibleDescription("Your public name");
  });
});

describe("PasswordField", () => {
  it("toggles password visibility", () => {
    render(<PasswordField label="Password" />);
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input).toHaveAttribute("type", "password");
  });
});

describe("Tabs", () => {
  const tabs = [
    { id: "a", label: "A", content: <p>Panel A</p> },
    { id: "b", label: "B", content: <p>Panel B</p> },
    { id: "c", label: "C", content: <p>Panel C</p> },
  ];

  it("shows the first tab by default and switches on click", () => {
    const onChange = vi.fn();
    render(<Tabs tabs={tabs} onChange={onChange} />);
    expect(screen.getByRole("tab", { name: "A" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel A");
    fireEvent.click(screen.getByRole("tab", { name: "B" }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel B");
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("supports defaultTabId and keyboard navigation", () => {
    render(<Tabs tabs={tabs} defaultTabId="b" />);
    const tab = screen.getByRole("tab", { name: "B" });
    expect(tab).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(tab, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "C" })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(screen.getByRole("tab", { name: "C" }), { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "A" })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(screen.getByRole("tab", { name: "A" }), { key: "End" });
    expect(screen.getByRole("tab", { name: "C" })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(screen.getByRole("tab", { name: "C" }), { key: "Home" });
    expect(screen.getByRole("tab", { name: "A" })).toHaveAttribute("aria-selected", "true");
  });
});

describe("LoginForm", () => {
  it("validates empty and malformed values without submitting", async () => {
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    expect(await screen.findByText("Please enter your email.")).toBeInTheDocument();
    expect(screen.getByText("Please enter your password.")).toBeInTheDocument();

    type("Email", "not-an-email");
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    expect(await screen.findByText("Please enter a valid email.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits trimmed email and password", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LoginForm onSubmit={onSubmit} />);
    type("Email", "  a@e.mtroyal.ca ");
    type(/^Password/, "secret123");
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ email: "a@e.mtroyal.ca", password: "secret123" }),
    );
  });

  it("shows the error thrown by onSubmit", async () => {
    render(<LoginForm onSubmit={() => Promise.reject(new Error("Invalid credentials"))} />);
    type("Email", "a@b.co");
    type(/^Password/, "x");
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid credentials");
  });
});

describe("SignupForm", () => {
  it("validates password length and confirmation", async () => {
    const onSubmit = vi.fn();
    render(<SignupForm onSubmit={onSubmit} />);
    type("Email", "a@b.co");
    type(/^Password/, "short");
    type("Confirm password", "different");
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    expect(await screen.findByText("Password must be at least 8 characters.")).toBeInTheDocument();
    expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits email and password when valid", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SignupForm onSubmit={onSubmit} />);
    type("Email", "a@b.co");
    type(/^Password/, "longenough1");
    type("Confirm password", "longenough1");
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ email: "a@b.co", password: "longenough1" }),
    );
  });

  it("shows the error thrown by onSubmit", async () => {
    render(<SignupForm onSubmit={() => Promise.reject(new Error("Email already used"))} />);
    type("Email", "a@b.co");
    type(/^Password/, "longenough1");
    type("Confirm password", "longenough1");
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Email already used");
  });
});

describe("AuthTabs", () => {
  it("opens on Login and switches to Signup", () => {
    render(<AuthTabs onLogin={vi.fn()} onSignup={vi.fn()} />);
    expect(screen.getByRole("form", { name: "Login" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Sign up" }));
    expect(screen.getByRole("form", { name: "Signup" })).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Login" })).not.toBeInTheDocument();
  });

  it("can open on the Signup tab", () => {
    render(<AuthTabs onLogin={vi.fn()} onSignup={vi.fn()} initialTab="signup" />);
    expect(screen.getByRole("form", { name: "Signup" })).toBeInTheDocument();
  });
});
