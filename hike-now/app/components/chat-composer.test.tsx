import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ChatComposer from "./chat-composer";
import { MENTION_OPTIONS, SHAREABLE_TRAILS } from "../chats/mock-data";

const draftStorageKey = "hike-now:chat-draft:me:conversation";
const onSend = vi.fn();
const props = {
  mentionOptions: [], onSend, draftStorageKey,
  shareableTrails: SHAREABLE_TRAILS,
  onShareTrail: vi.fn(), onProposeHike: vi.fn(),
};

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("chat hike pickers", () => {
  it.each([
    ["Share a trail", props.onShareTrail],
    ["Propose a hike", props.onProposeHike],
  ])("sends from %s when clicking a hike blurs search without a focus target", (label, callback) => {
    render(<ChatComposer {...props} />);
    fireEvent.click(screen.getByRole("button", { name: label }));
    const option = within(screen.getByRole("dialog")).getByRole("button", { name: /Old Fort Point/ });
    fireEvent.pointerDown(option);
    fireEvent.mouseDown(option);
    fireEvent.blur(screen.getByRole("searchbox"), { relatedTarget: null });
    expect(option).toBeInTheDocument();
    fireEvent.mouseUp(option);
    fireEvent.click(option);
    expect(callback).toHaveBeenCalledExactlyOnceWith(SHAREABLE_TRAILS[0].id);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders a fixed overlay outside the chat layout and focuses without scrolling", () => {
    const { container } = render(<ChatComposer {...props} />);
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    fireEvent.click(screen.getByRole("button", { name: "Share a trail" }));
    const panel = screen.getByRole("dialog");
    expect(panel.parentElement).toBe(document.body);
    expect(container).not.toContainElement(panel);
    expect(panel).toHaveClass("fixed", "z-50");
    expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
  });

  it("tracks the clicked button on scroll and keeps the panel within the viewport on resize", () => {
    render(<ChatComposer {...props} />);
    const trigger = screen.getByRole("button", { name: "Propose a hike" });
    const rect = vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue(
      new DOMRect(700, 500, 44, 44),
    );
    fireEvent.click(trigger);
    const panel = screen.getByRole("dialog");
    expect(panel.style.left).toBe("672px");
    expect(panel.style.bottom).toBe("276px");
    rect.mockReturnValue(new DOMRect(120, 400, 44, 44));
    fireEvent.scroll(window);
    expect(panel.style.left).toBe("120px");
    expect(panel.style.bottom).toBe("376px");
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(320);
    fireEvent.resize(window);
    expect(panel.style.width).toBe("288px");
    expect(panel.style.left).toBe("16px");
  });

  it.each([
    ["Share a trail", props.onShareTrail, props.onProposeHike],
    ["Propose a hike", props.onProposeHike, props.onShareTrail],
  ])("opens %s without sending, searches hikes, and sends only the selected hike", (label, callback, otherCallback) => {
    render(<ChatComposer {...props} />);
    const trigger = screen.getByRole("button", { name: label });
    fireEvent.click(trigger);
    const picker = screen.getByRole("dialog", { name: label });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("aria-controls", picker.id);
    const search = within(picker).getByRole("searchbox", { name: "Search hikes" });
    expect(search).toHaveFocus();
    expect(within(picker).getAllByRole("button")).toHaveLength(SHAREABLE_TRAILS.length);
    expect(callback).not.toHaveBeenCalled();
    fireEvent.change(search, { target: { value: "  yOhO  " } });
    expect(within(picker).getAllByRole("button")).toHaveLength(1);
    fireEvent.click(within(picker).getByRole("button", { name: /Yoho Lake/ }));
    expect(callback).toHaveBeenCalledExactlyOnceWith(SHAREABLE_TRAILS[2].id);
    expect(otherCallback).not.toHaveBeenCalled();
    expect(onSend).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("searches locations and explains empty results without sending a card", () => {
    render(<ChatComposer {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Share a trail" }));
    const search = screen.getByRole("searchbox", { name: "Search hikes" });
    fireEvent.change(search, { target: { value: "british columbia" } });
    expect(within(screen.getByRole("dialog")).getAllByRole("button")).toHaveLength(1);
    fireEvent.change(search, { target: { value: "missing hike" } });
    expect(screen.getByRole("status")).toHaveTextContent("No hikes match your search.");
    expect(within(screen.getByRole("dialog")).queryByRole("button")).not.toBeInTheDocument();
    expect(props.onShareTrail).not.toHaveBeenCalled();
  });

  it("shows a clear empty state when no hikes are available", () => {
    render(<ChatComposer {...props} shareableTrails={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Propose a hike" }));
    expect(screen.getByRole("status")).toHaveTextContent("No hikes are available");
    expect(props.onProposeHike).not.toHaveBeenCalled();
  });

  it("switches between pickers, resets search, and never opens two panels", () => {
    render(<ChatComposer {...props} mentionOptions={MENTION_OPTIONS} />);
    fireEvent.click(screen.getByRole("button", { name: "Share a trail" }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "yoho" } });
    fireEvent.click(screen.getByRole("button", { name: "Propose a hike" }));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByRole("dialog", { name: "Propose a hike" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: "Mention a hiking partner" }));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByRole("dialog", { name: "Mention a hiking partner" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Share a trail" }));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByRole("dialog", { name: "Share a trail" })).toBeInTheDocument();
  });

  it("dismisses on Escape, toggle, outside click, or focus leaving the panel", () => {
    render(<ChatComposer {...props} />);
    const trigger = screen.getByRole("button", { name: "Propose a hike" });
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("searchbox"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    fireEvent.click(trigger);
    fireEvent.click(trigger);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(trigger);
    act(() => screen.getByLabelText("Message").focus());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(props.onProposeHike).not.toHaveBeenCalled();
  });

  it("does not submit the message draft when pressing Enter in hike search", () => {
    render(<ChatComposer {...props} />);
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Unsent draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Share a trail" }));
    fireEvent.keyDown(screen.getByRole("searchbox"), { key: "Enter" });
    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Message")).toHaveValue("Unsent draft");
  });

  it("disables both triggers and hike selection while an action is pending", () => {
    const view = render(<ChatComposer {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Share a trail" }));
    view.rerender(<ChatComposer {...props} actionPending />);
    expect(screen.getByRole("button", { name: "Share a trail" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Propose a hike" })).toBeDisabled();
    expect(screen.getByRole("searchbox")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Old Fort Point/ }));
    expect(props.onShareTrail).not.toHaveBeenCalled();
  });
});

describe("persistent chat drafts", () => {
  it("restores unsent text and its delivery ID after remounting and clears only after acknowledgement", async () => {
    onSend.mockResolvedValue(false);
    const first = render(<ChatComposer {...props} />);
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Keep until delivered" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => expect(onSend).toHaveBeenCalledOnce());
    const messageId = onSend.mock.calls[0][1];
    expect(localStorage.getItem(draftStorageKey)).toContain("Keep until delivered");
    first.unmount();

    onSend.mockResolvedValue(true);
    render(<ChatComposer {...props} />);
    expect(screen.getByLabelText("Message")).toHaveValue("Keep until delivered");
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => expect(screen.getByLabelText("Message")).toHaveValue(""));
    expect(onSend).toHaveBeenLastCalledWith("Keep until delivered", messageId);
    expect(localStorage.getItem(draftStorageKey)).toBeNull();
  });

  it("keeps drafts separate for different conversations and accounts", () => {
    const first = render(<ChatComposer {...props} />);
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Private draft" } });
    first.unmount();
    const second = render(<ChatComposer {...props} draftStorageKey="hike-now:chat-draft:me:other" />);
    expect(screen.getByLabelText("Message")).toHaveValue("");
    second.unmount();
    render(<ChatComposer {...props} draftStorageKey="hike-now:chat-draft:other:conversation" />);
    expect(screen.getByLabelText("Message")).toHaveValue("");
  });

  it("gives edited text a new delivery ID after an uncertain send", async () => {
    onSend.mockResolvedValue(false);
    render(<ChatComposer {...props} />);
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "First version" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => expect(onSend).toHaveBeenCalledOnce());
    const firstId = onSend.mock.calls[0][1];
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Edited version" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => expect(onSend).toHaveBeenCalledTimes(2));
    expect(onSend.mock.calls[1][1]).not.toBe(firstId);
  });

  it("reports storage failure without losing the in-memory draft", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => { throw new Error("quota exceeded"); });
    render(<ChatComposer {...props} />);
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Still here" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Keep this page open");
    expect(screen.getByLabelText("Message")).toHaveValue("Still here");
  });

  it("automatically retries a pending send with the same ID when connectivity returns", async () => {
    onSend.mockResolvedValueOnce(false).mockResolvedValue(true);
    render(<ChatComposer {...props} />);
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Deliver after reconnect" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByRole("status");
    const messageId = onSend.mock.calls[0][1];
    await act(async () => { window.dispatchEvent(new Event("online")); });
    expect(onSend).toHaveBeenLastCalledWith("Deliver after reconnect", messageId);
    expect(onSend).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText("Message")).toHaveValue("");
    expect(localStorage.getItem(draftStorageKey)).toBeNull();
  });

  it("resumes a previously attempted send after reopening the chat", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    try {
      const messageId = crypto.randomUUID();
      localStorage.setItem(draftStorageKey, JSON.stringify({ text: "Resume delivery", messageId, attempted: true }));
      onSend.mockResolvedValue(true);
      render(<ChatComposer {...props} />);
      await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
      expect(onSend).toHaveBeenCalledExactlyOnceWith("Resume delivery", messageId);
      expect(screen.getByLabelText("Message")).toHaveValue("");
    } finally {
      vi.useRealTimers();
    }
  });

  it("never automatically sends text that the user has not submitted", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    try {
      render(<ChatComposer {...props} />);
      fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Just drafting" } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10000);
        window.dispatchEvent(new Event("online"));
      });
      expect(onSend).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops automatic retries when the user edits a pending draft", async () => {
    onSend.mockResolvedValue(false);
    render(<ChatComposer {...props} />);
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Old text" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByRole("status");
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "New draft" } });
    await act(async () => { window.dispatchEvent(new Event("online")); });
    expect(onSend).toHaveBeenCalledOnce();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
