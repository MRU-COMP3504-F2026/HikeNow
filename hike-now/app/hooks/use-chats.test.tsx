import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { INITIAL_THREADS, SHAREABLE_TRAILS } from "../chats/mock-data";
import type { ChatMessage } from "../chats/types";
import { useChats } from "./use-chats";

const { getChatThreads, sendChatMessage } = vi.hoisted(() => ({
  getChatThreads: vi.fn(), sendChatMessage: vi.fn(),
}));
vi.mock("../actions/chats", () => ({
  getChatThreads, sendChatMessage, markChatRead: vi.fn(),
  createGroupConversation: vi.fn(), respondToProposal: vi.fn(),
  startConversation: vi.fn(), updateChatRequest: vi.fn(),
}));
vi.mock("../actions/follows", () => ({ followUser: vi.fn(), unfollowUser: vi.fn() }));

const initialThreads = [{ ...INITIAL_THREADS[0], unread: false }];
const options = { initialThreads, userId: "me" };
const saved: ChatMessage = { id: "saved", from: "me", kind: "text", text: "Do not lose this" };

beforeEach(() => {
  vi.resetAllMocks();
  getChatThreads.mockResolvedValue(structuredClone(initialThreads));
  sendChatMessage.mockResolvedValue(saved);
});

describe("chat delivery reconciliation", () => {
  it.each(["trail", "proposal"] as const)("sends the explicitly selected hike as a %s card", async (kind) => {
    const trail = SHAREABLE_TRAILS[2];
    const { result } = renderHook(() => useChats(options));
    await act(async () => {
      if (kind === "trail") await result.current.shareTrail(trail.id);
      else await result.current.proposeHike(trail.id);
    });
    expect(sendChatMessage).toHaveBeenCalledExactlyOnceWith(
      initialThreads[0].id, { kind, trailId: trail.id }, expect.any(String),
    );
  });

  it("keeps a confirmed send when a later refresh returns an older snapshot", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    try {
      const { result } = renderHook(() => useChats(options));
      await act(async () => { await result.current.sendText("Do not lose this"); });
      await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
      expect(result.current.active?.messages).toContainEqual(saved);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps a confirmed send when stale server props arrive and does not duplicate its server echo", async () => {
    const { result, rerender } = renderHook(
      ({ threads }) => useChats({ ...options, initialThreads: threads }),
      { initialProps: { threads: initialThreads } },
    );
    await act(async () => { await result.current.sendText("Do not lose this"); });
    rerender({ threads: structuredClone(initialThreads) });
    expect(result.current.active?.messages).toContainEqual(saved);
    rerender({ threads: [{ ...initialThreads[0], messages: [...initialThreads[0].messages, saved] }] });
    expect(result.current.active?.messages.filter((message) => message.id === saved.id)).toHaveLength(1);
    rerender({ threads: structuredClone(initialThreads) });
    expect(result.current.active?.messages).toContainEqual(saved);
  });

  it("retries an uncertain send using the same message ID", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      sendChatMessage.mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValue(saved);
      const { result } = renderHook(() => useChats(options));
      await act(async () => {
        const sending = result.current.sendText("Do not lose this");
        await vi.advanceTimersByTimeAsync(5000);
        await sending;
      });

      expect(sendChatMessage).toHaveBeenCalledTimes(2);
      const firstId = sendChatMessage.mock.calls[0][2];
      expect(firstId).toEqual(expect.any(String));
      expect(sendChatMessage.mock.calls[1][2]).toBe(firstId);
      expect(result.current.active?.messages.filter((message) => message.id === saved.id)).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the conversation if a stale server snapshot omits it entirely", async () => {
    const { result, rerender } = renderHook(
      ({ threads }) => useChats({ ...options, initialThreads: threads }),
      { initialProps: { threads: initialThreads } },
    );
    await act(async () => { await result.current.sendText("Do not lose this"); });
    rerender({ threads: [] });
    expect(result.current.active?.messages).toContainEqual(saved);
  });

  it("recovers incoming messages immediately when connectivity returns", async () => {
    const { result } = renderHook(() => useChats(options));
    const incoming: ChatMessage = { id: "incoming", from: "them", kind: "text", text: "I am here" };
    getChatThreads.mockResolvedValue([{ ...initialThreads[0], messages: [...initialThreads[0].messages, incoming] }]);
    await act(async () => { window.dispatchEvent(new Event("online")); });
    expect(result.current.active?.messages).toContainEqual(incoming);
  });

  it("reports failure after three attempts without adding an unconfirmed message", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      sendChatMessage.mockRejectedValue(new Error("Unavailable"));
      const { result } = renderHook(() => useChats(options));
      await act(async () => {
        const sending = expect(result.current.sendText("Do not lose this")).rejects.toThrow("Unavailable");
        await vi.advanceTimersByTimeAsync(5000);
        await sending;
      });
      expect(sendChatMessage).toHaveBeenCalledTimes(3);
      expect(new Set(sendChatMessage.mock.calls.map((call) => call[2])).size).toBe(1);
      expect(result.current.active?.messages).toEqual(initialThreads[0].messages);
    } finally {
      vi.useRealTimers();
    }
  });

  it("restores the target conversation if stale props remove it during a send", async () => {
    let finish!: (message: ChatMessage) => void;
    sendChatMessage.mockReturnValue(new Promise<ChatMessage>((resolve) => { finish = resolve; }));
    const { result, rerender } = renderHook(
      ({ threads }) => useChats({ ...options, initialThreads: threads }),
      { initialProps: { threads: initialThreads } },
    );
    const sending = result.current.sendText("Do not lose this");
    rerender({ threads: [] });
    await act(async () => {
      finish(saved);
      await sending;
    });
    expect(result.current.active?.messages).toContainEqual(saved);
  });
});
