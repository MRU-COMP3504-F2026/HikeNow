import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChatComposer from "./chat-composer";

const draftStorageKey = "hike-now:chat-draft:me:conversation";
const onSend = vi.fn();
const props = {
  mentionOptions: [], onSend, draftStorageKey,
  onShareTrail: vi.fn(), onProposeHike: vi.fn(),
};

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
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
