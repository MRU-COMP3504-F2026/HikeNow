// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { database, getCurrentUser } = vi.hoisted(() => ({
  database: { select: vi.fn(), transaction: vi.fn(), insert: vi.fn(), update: vi.fn() },
  getCurrentUser: vi.fn(),
}));
vi.mock("../db", () => ({ db: database }));
vi.mock("../lib/session", () => ({ getCurrentUser }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: () => { throw new Error("NEXT_REDIRECT"); } }));

import { createGroupConversation, getChatData, getChatThreads, markChatRead, respondToProposal, sendChatMessage, startConversation, updateChatRequest } from "./chats";

const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";
const C = "33333333-3333-3333-3333-333333333333";

function selectResults(results: unknown[][]) {
  type Query = Promise<unknown[]> & Record<"from" | "innerJoin" | "where" | "orderBy" | "for", () => Query>;
  for (const rows of results) {
    const query: Query = Object.assign(Promise.resolve(rows), {
      from: vi.fn(() => query),
      innerJoin: vi.fn(() => query),
      where: vi.fn(() => query),
      orderBy: vi.fn(() => query),
      for: vi.fn(() => query),
    });
    database.select.mockReturnValueOnce(query);
  }
}

beforeEach(() => {
  vi.resetAllMocks();
  getCurrentUser.mockResolvedValue({ id: A, email: "alice@example.invalid" });
  database.transaction.mockImplementation(async (action) => action(database));
});

describe("private chat actions", () => {
  it("requires a session for every read and mutation", async () => {
    getCurrentUser.mockResolvedValue(null);
    const calls = [
      () => getChatData(), () => getChatThreads(), () => startConversation(B),
      () => createGroupConversation("Group", [B, C]),
      () => sendChatMessage(C, { kind: "text", text: "Hello" }),
      () => markChatRead(C), () => updateChatRequest(C, "accept"),
      () => respondToProposal(C, B, "yes"),
    ];
    for (const call of calls) await expect(call()).rejects.toThrow("NEXT_REDIRECT");
    expect(database.select).not.toHaveBeenCalled();
    expect(database.transaction).not.toHaveBeenCalled();
  });

  it("rejects invalid and self-recipient IDs before database access", async () => {
    await expect(startConversation("invalid")).rejects.toThrow("Invalid");
    await expect(startConversation(A)).rejects.toThrow("yourself");
    expect(database.select).not.toHaveBeenCalled();
  });

  it("requires an actual follow before creating a chat", async () => {
    selectResults([[]]);
    await expect(startConversation(B)).rejects.toThrow("Follow this hiker");
    expect(database.transaction).not.toHaveBeenCalled();
  });

  it("validates group names, member counts, duplicates, and self-invites", async () => {
    const fifteenInvitees = Array.from({ length: 15 }, (_, index) =>
      `00000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`);
    await expect(createGroupConversation("", [B, C])).rejects.toThrow("Group names");
    await expect(createGroupConversation("x".repeat(101), [B, C])).rejects.toThrow("Group names");
    await expect(createGroupConversation("Group", [B])).rejects.toThrow("between 3 and 15");
    await expect(createGroupConversation("Group", fifteenInvitees)).rejects.toThrow("between 3 and 15");
    await expect(createGroupConversation("Group", [B, B.toUpperCase()])).rejects.toThrow("different hikers");
    await expect(createGroupConversation("Group", [A, B])).rejects.toThrow("yourself");
    await expect(createGroupConversation("Group", [B, "bad-id"])).rejects.toThrow("Invalid");
    expect(database.transaction).not.toHaveBeenCalled();
  });

  it("rejects group creation if even one invitee is not followed", async () => {
    selectResults([[{ id: B, email: "bob@example.invalid" }]]);
    await expect(createGroupConversation("Weekend hikers", [B, C])).rejects.toThrow("follow every hiker");
  });

  it.each(["", " ", "x".repeat(4001)])("rejects invalid text (%#)", async (text) => {
    await expect(sendChatMessage(C, { kind: "text", text })).rejects.toThrow("1 and 4000");
    expect(database.transaction).not.toHaveBeenCalled();
  });

  it("rejects invalid delivery IDs before database access", async () => {
    await expect(sendChatMessage(C, { kind: "text", text: "Hello" }, "not-a-uuid")).rejects.toThrow("Invalid");
    expect(database.transaction).not.toHaveBeenCalled();
  });

  it("returns an already committed message on retry without inserting another", async () => {
    selectResults([
      [{ id: C, kind: "direct" }],
      [{ hikerId: A, accepted: true }, { hikerId: B }],
      [{ id: B, conversationId: C, senderId: A, content: { kind: "text", text: "Hello" } }],
    ]);
    await expect(sendChatMessage(C, { kind: "text", text: "Hello" }, B)).resolves.toMatchObject({
      id: B, from: "me", kind: "text", text: "Hello",
    });
    expect(database.insert).not.toHaveBeenCalled();
    expect(database.update).not.toHaveBeenCalled();
  });

  it("does not reuse another sender's message ID", async () => {
    selectResults([
      [{ id: C, kind: "direct" }],
      [{ hikerId: A, accepted: true }, { hikerId: B }],
      [{ id: B, conversationId: C, senderId: B, content: { kind: "text", text: "Not yours" } }],
    ]);
    await expect(sendChatMessage(C, { kind: "text", text: "Hello" }, B)).rejects.toThrow("already in use");
    expect(database.insert).not.toHaveBeenCalled();
  });

  it("rejects unsupported messages and nonexistent trails", async () => {
    const input = JSON.parse('{"kind":"unsupported"}');
    await expect(sendChatMessage(C, input)).rejects.toThrow("Unsupported");
    expect(database.transaction).not.toHaveBeenCalled();
    selectResults([[{ id: C, kind: "direct" }], [{ hikerId: A, accepted: true }, { hikerId: B }], []]);
    await expect(sendChatMessage(C, { kind: "trail", trailId: B })).rejects.toThrow("no longer exists");
  });

  it("rejects outsiders and blocked participants before writing", async () => {
    selectResults([
      [{ id: C, kind: "direct" }],
      [{ hikerId: B }, { hikerId: C }],
      [{ id: C, kind: "direct" }],
      [{ hikerId: A, blocked: false }, { hikerId: B, blocked: true }],
    ]);
    await expect(sendChatMessage(C, { kind: "text", text: "Hello" })).rejects.toThrow("cannot access");
    await expect(updateChatRequest(C, "accept")).rejects.toThrow("blocked");
  });

  it("does not allow replying to an unaccepted request", async () => {
    selectResults([[{ id: C, kind: "direct" }], [{ hikerId: A, accepted: false }, { hikerId: B }], []]);
    await expect(sendChatMessage(C, { kind: "text", text: "Hello" })).rejects.toThrow("Accept this request");
  });

  it("uses the creator's follow relationship to authorize group requests", async () => {
    selectResults([
      [{ id: C, kind: "group", createdBy: B }],
      [{ hikerId: A, accepted: false }, { hikerId: B }, { hikerId: C }],
      [],
    ]);
    await expect(sendChatMessage(C, { kind: "text", text: "Hello" })).rejects.toThrow("Accept this request");
  });

  it("returns no fixture or public chat when the hiker has no conversations", async () => {
    selectResults([[]]);
    await expect(getChatThreads()).resolves.toEqual([]);
    expect(database.select).toHaveBeenCalledTimes(1);
  });

  it("maps stored messages, follows, requests, and individual RSVPs for the viewer", async () => {
    const createdAt = new Date("2026-11-05T12:00:00Z");
    selectResults([
      [{
        room: { id: C, kind: "direct", createdAt },
        membership: { accepted: false, readAt: null },
      }],
      [
        { id: "text", conversationId: C, createdAt, senderId: B, content: { kind: "text", text: "Hello" } },
        {
          id: "proposal", conversationId: C, createdAt, senderId: A,
          content: { kind: "proposal", proposal: { trailName: "Trail", when: "Saturday", where: "Trailhead", going: [], rsvp: "none" } },
          responses: { [A]: "yes", [B]: "yes" },
        },
      ],
      [{ followerId: A, followeeId: B }],
      [
        { membership: { conversationId: C, hikerId: A, blocked: false }, person: { id: A, email: "alice@example.invalid" } },
        { membership: { conversationId: C, hikerId: B, blocked: false }, person: { id: B, email: "bob@example.invalid" } },
      ],
    ]);
    const [thread] = await getChatThreads();
    expect(thread).toMatchObject({ id: C, following: true, isRequest: false, unread: true, blocked: false });
    expect(thread.kind).toBe("direct");
    if (thread.kind !== "direct") throw new Error("Expected a direct chat.");
    expect(thread.person).toMatchObject({ id: B, name: "Bob" });
    expect(thread.messages[0]).toMatchObject({ kind: "text", from: "them", text: "Hello" });
    expect(thread.messages[1]).toMatchObject({ kind: "proposal", from: "me", proposal: { rsvp: "yes", going: [{ id: B }] } });
  });

  it("maps a group invitation with sender names and all individual RSVPs", async () => {
    const createdAt = new Date("2026-11-05T12:00:00Z");
    selectResults([
      [{ room: { id: C, kind: "group", groupName: "Weekend hikes", createdBy: B, createdAt }, membership: { accepted: false, readAt: null } }],
      [{
        id: "proposal", conversationId: C, createdAt, senderId: B,
        content: { kind: "proposal", proposal: { trailName: "Trail", when: "Saturday", where: "Trailhead", going: [], rsvp: "none" } },
        responses: { [A]: "yes", [B]: "yes", [C]: "yes" },
      }],
      [],
      [
        { membership: { conversationId: C, hikerId: A, blocked: false }, person: { id: A, email: "alice@example.invalid" } },
        { membership: { conversationId: C, hikerId: B, blocked: false }, person: { id: B, email: "bob@example.invalid" } },
        { membership: { conversationId: C, hikerId: C, blocked: false }, person: { id: C, email: "carol@example.invalid" } },
      ],
    ]);
    const [thread] = await getChatThreads();
    expect(thread).toMatchObject({
      kind: "group", name: "Weekend hikes", creator: { id: B }, isRequest: true, unread: true,
      members: [{ id: A }, { id: B }, { id: C }],
      messages: [{ sender: { id: B }, proposal: { rsvp: "yes", going: [{ id: B }, { id: C }] } }],
    });
  });
});
