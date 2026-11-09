// @vitest-environment node
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { chatMessage, conversationMember, hiker, hike } from "../db/schema";

const state = vi.hoisted((): {
  database: ReturnType<typeof drizzle> | undefined;
  user: { id: string; email: string } | null;
} => ({ database: undefined, user: null }));

vi.mock("../db", () => ({ get db() { return state.database; } }));
vi.mock("../lib/session", () => ({ getCurrentUser: async () => state.user }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: () => { throw new Error("NEXT_REDIRECT"); } }));

// Opt in against a configured PostgreSQL database after running db:chats.
describe.skipIf(process.env.CHAT_INTEGRATION !== "1")("PostgreSQL follow and messaging flow", () => {
  let client: ReturnType<typeof postgres>;
  let database: ReturnType<typeof drizzle>;
  let chats: typeof import("./chats");
  let follows: typeof import("./follows");
  const people = Array.from({ length: 3 }, () => {
    const id = randomUUID();
    return { id, email: `chat-test-${id}@example.invalid` };
  });
  const trailId = randomUUID();

  beforeAll(async () => {
    config({ quiet: true });
    if (!process.env.DATABASE_URL) throw new Error("CHAT_INTEGRATION requires DATABASE_URL.");
    client = postgres(process.env.DATABASE_URL, { max: 3 });
    database = drizzle(client);
    state.database = database;
    chats = await import("./chats");
    follows = await import("./follows");
    await database.insert(hiker).values(people.map((person) => ({ ...person, password: "integration-test-unused" })));
    await database.insert(hike).values({ id: trailId, name: "Integration test trail" });
  });

  afterAll(async () => {
    if (database) {
      await database.delete(hiker).where(inArray(hiker.id, people.map((person) => person.id)));
      await database.delete(hike).where(eq(hike.id, trailId));
    }
    if (client) await client.end();
  });

  it("persists follows, unique chats, text, requests, trail shares, RSVPs, and blocks", async () => {
    const [alice, bob, outsider] = people;
    state.user = alice;
    await expect(chats.startConversation(bob.id)).rejects.toThrow("Follow this hiker");
    await follows.followUser(alice.id, bob.id);
    await follows.followUser(alice.id, bob.id);
    expect(await follows.getFollowing(alice.id)).toEqual([{ followerId: alice.id, followeeId: bob.id }]);
    const [id, duplicateId] = await Promise.all([
      chats.startConversation(bob.id), chats.startConversation(bob.id),
    ]);
    expect(duplicateId).toBe(id);
    expect((await chats.getChatThreads())[0]).toMatchObject({ id, following: true, isRequest: false, messages: [] });

    state.user = bob;
    expect(await chats.getChatThreads()).toEqual([]);
    state.user = alice;
    const messageId = randomUUID();
    const firstInput = { kind: "text" as const, text: "  Hello from the database  " };
    const [firstDelivery, duplicateDelivery] = await Promise.all([
      chats.sendChatMessage(id, firstInput, messageId),
      chats.sendChatMessage(id, firstInput, messageId),
    ]);
    expect(firstDelivery.id).toBe(messageId);
    expect(duplicateDelivery).toEqual(firstDelivery);
    await expect(chats.sendChatMessage(id, firstInput, messageId)).resolves.toEqual(firstDelivery);
    state.user = bob;
    let threads = await chats.getChatThreads();
    expect(threads[0]).toMatchObject({
      id, isRequest: true, unread: true,
      messages: [{ kind: "text", text: "Hello from the database", from: "them" }],
    });
    await chats.markChatRead(id);
    expect((await chats.getChatThreads())[0].unread).toBe(true);
    await expect(chats.sendChatMessage(id, { kind: "text", text: "Reply" })).rejects.toThrow("Accept this request");
    await chats.updateChatRequest(id, "accept");
    await chats.sendChatMessage(id, { kind: "text", text: "Accepted and replied" });
    expect((await chats.getChatThreads())[0]).toMatchObject({ isRequest: false, unread: false });

    state.user = outsider;
    expect(await chats.getChatThreads()).toEqual([]);
    await expect(chats.sendChatMessage(id, { kind: "text", text: "Intrusion" })).rejects.toThrow("cannot access");
    await expect(chats.markChatRead(id)).rejects.toThrow("cannot access");
    await expect(chats.updateChatRequest(id, "block")).rejects.toThrow("cannot access");

    state.user = alice;
    await follows.unfollowUser(alice.id, bob.id);
    await chats.sendChatMessage(id, { kind: "trail", trailId });
    await chats.sendChatMessage(id, { kind: "proposal", trailId });
    threads = await chats.getChatThreads();
    const proposal = threads[0].messages.at(-1)!;
    expect(proposal).toMatchObject({ kind: "proposal", proposal: { rsvp: "yes", going: [] } });
    state.user = bob;
    await chats.respondToProposal(id, proposal.id, "yes");
    expect((await chats.getChatThreads())[0].messages.at(-1)).toMatchObject({
      kind: "proposal", proposal: { rsvp: "yes", going: [{ id: alice.id }] },
    });
    state.user = alice;
    expect((await chats.getChatThreads())[0].messages.at(-1)).toMatchObject({
      kind: "proposal", proposal: { rsvp: "yes", going: [{ id: bob.id }] },
    });
    expect((await chats.getChatThreads())[0].messages).toHaveLength(4);

    await expect(chats.sendChatMessage(id, { kind: "text", text: " " })).rejects.toThrow("1 and 4000");
    await expect(chats.sendChatMessage(id, { kind: "text", text: "x".repeat(4001) })).rejects.toThrow("1 and 4000");
    await chats.sendChatMessage(id, { kind: "text", text: "x".repeat(4000) });
    await expect(chats.startConversation(alice.id)).rejects.toThrow("yourself");

    state.user = bob;
    await chats.updateChatRequest(id, "delete");
    expect(await chats.getChatThreads()).toEqual([]);
    state.user = alice;
    await chats.sendChatMessage(id, { kind: "text", text: "Reappears after hiding" });
    state.user = bob;
    expect((await chats.getChatThreads())[0].messages.at(-1)).toMatchObject({ text: "Reappears after hiding" });
    await chats.updateChatRequest(id, "block");
    expect(await chats.getChatThreads()).toEqual([]);
    state.user = alice;
    expect((await chats.getChatThreads())[0].blocked).toBe(true);
    await expect(chats.sendChatMessage(id, { kind: "text", text: "Blocked" })).rejects.toThrow("blocked");
    await follows.followUser(alice.id, bob.id);
    await expect(chats.startConversation(bob.id)).rejects.toThrow("blocked");
    state.user = null;
    await expect(chats.getChatThreads()).rejects.toThrow("NEXT_REDIRECT");
    await expect(chats.sendChatMessage(id, { kind: "text", text: "Expired" })).rejects.toThrow("NEXT_REDIRECT");

    await database.delete(hiker).where(eq(hiker.id, alice.id));
    expect(await database.select().from(chatMessage).where(eq(chatMessage.conversationId, id))).toEqual([]);
    expect(await database.select().from(conversationMember).where(eq(conversationMember.conversationId, id))).toEqual([]);
  }, 60000);
});
