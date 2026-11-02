import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useFollow } from "./use-follow";

describe("useFollow", () => {
  it("starts not following by default and respects initialFollowing", () => {
    expect(renderHook(() => useFollow()).result.current.following).toBe(false);
    expect(
      renderHook(() => useFollow({ initialFollowing: true })).result.current.following,
    ).toBe(true);
  });

  it("toggles and calls onChange with the new state", async () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useFollow({ onChange }));

    await act(() => result.current.toggle());
    expect(result.current.following).toBe(true);
    expect(onChange).toHaveBeenLastCalledWith(true);

    await act(() => result.current.toggle());
    expect(result.current.following).toBe(false);
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it("updates optimistically and is pending until onChange resolves", async () => {
    let resolve!: () => void;
    const onChange = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    const { result } = renderHook(() => useFollow({ onChange }));

    let promise!: Promise<void>;
    act(() => {
      promise = result.current.toggle();
    });
    expect(result.current.following).toBe(true);
    expect(result.current.pending).toBe(true);

    await act(async () => {
      resolve();
      await promise;
    });
    expect(result.current.pending).toBe(false);
    expect(result.current.following).toBe(true);
  });

  it("ignores extra calls while a request is pending", async () => {
    let resolve!: () => void;
    const onChange = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    const { result } = renderHook(() => useFollow({ onChange }));

    let first!: Promise<void>;
    act(() => {
      first = result.current.toggle();
      void result.current.toggle();
      void result.current.unfollow();
    });
    expect(onChange).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolve();
      await first;
    });
    expect(result.current.following).toBe(true);
  });

  it("rolls back and exposes the error when onChange fails", async () => {
    const onChange = vi.fn().mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useFollow({ onChange }));

    await act(() => result.current.toggle());
    expect(result.current.following).toBe(false);
    expect(result.current.pending).toBe(false);
    expect(result.current.error?.message).toBe("network");
  });

  it("clears the previous error on the next attempt", async () => {
    const onChange = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useFollow({ onChange }));

    await act(() => result.current.toggle());
    expect(result.current.error).not.toBeNull();
    await act(() => result.current.toggle());
    await waitFor(() => expect(result.current.error).toBeNull());
    expect(result.current.following).toBe(true);
  });

  it("follow and unfollow do nothing when already in that state", async () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useFollow({ onChange, initialFollowing: true }));

    await act(() => result.current.follow());
    expect(onChange).not.toHaveBeenCalled();
    await act(() => result.current.unfollow());
    expect(onChange).toHaveBeenCalledWith(false);
    expect(result.current.following).toBe(false);
  });

  it("always uses the latest onChange callback", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(({ cb }) => useFollow({ onChange: cb }), {
      initialProps: { cb: first },
    });
    rerender({ cb: second });
    await act(() => result.current.toggle());
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(true);
  });
});
