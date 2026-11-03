import { describe, expect, it } from "vitest";
import { INITIAL_THREADS } from "./mock-data";
import { nextSaturdayLabel, parseMentions, previewOf } from "./utils";

describe("parseMentions", () => {
  it("splits plain text and @mentions", () => {
    expect(parseMentions("Ask @Lucas too, ok?")).toEqual([
      { text: "Ask ", mention: false },
      { text: "@Lucas", mention: true },
      { text: " too, ok?", mention: false },
    ]);
  });

  it("does not treat a lone @ as a mention", () => {
    expect(parseMentions("meet @ 9")).toEqual([{ text: "meet @ 9", mention: false }]);
  });

  it("returns an empty list for empty text", () => {
    expect(parseMentions("")).toEqual([]);
  });
});

describe("previewOf", () => {
  const thread = (id: string) => INITIAL_THREADS.find((t) => t.id === id)!;

  it("shows the last text message, prefixed when it is mine", () => {
    expect(previewOf(thread("marcus"))).toBe("You: Good to know, thanks for the heads up.");
    expect(previewOf(thread("lucas"))).toBe("Next one is Yoho Lake? I hear it is a long one.");
  });

  it("describes proposals", () => {
    expect(previewOf(thread("priya"))).toMatch(/^Hike proposal · /);
  });

  it("describes shared trails and empty threads", () => {
    const base = thread("hana");
    const trail = base.messages.find((m) => m.kind === "trail")!;
    expect(previewOf({ ...base, messages: [trail] })).toMatch(/^You: Shared a trail: /);
    expect(previewOf({ ...base, messages: [] })).toBe("");
  });
});

describe("nextSaturdayLabel", () => {
  it("returns the next Saturday at 9:00 AM", () => {
    // Monday, Nov 2, 2026
    expect(nextSaturdayLabel(new Date(2026, 10, 2))).toBe("Sat, Nov 7 · 9:00 AM");
  });

  it("jumps a full week when today is Saturday", () => {
    expect(nextSaturdayLabel(new Date(2026, 10, 7))).toBe("Sat, Nov 14 · 9:00 AM");
  });
});
