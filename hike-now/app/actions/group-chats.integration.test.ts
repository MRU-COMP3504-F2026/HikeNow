// @vitest-environment node
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { config } from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { conversation, conversationMember, follow, hiker, hike } from "../db/schema";

const state = vi.hoisted((): {
  database: ReturnType<typeof drizzle> | undefined;
  user: { id: string; email: string } | null;
} => ({ database: undefined, user: null }));

vi.mock("../db", () => ({ get db() { return state.database; } }));
vi.mock("../lib/session", () => ({ getCurrentUser: async () => state.user }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: () => { throw new Error("NEXT_REDIRECT"); } }));

describe.skipIf(process.env.CHAT_INTEGRATION !== "1")("PostgreSQL group chats", () => {
  let client: ReturnType<typeof postgres>;
  let database: ReturnType<typeof drizzle>;
  let chats: typeof import("./chats");
  const people = Array.from({ length: 17 }, () => {
    const id = randomUUID();
    return { id, email: `group-chat-test-${id}@example.invalid` };
  });
  const trailId = randomUUID();
  const groupIds: string[] = [];

  beforeAll(async () => {
    config({ quiet: true });
    if (!process.env.DATABASE_URL) throw new Error("CHAT_INTEGRATION requires DATABASE_URL.");
    client = postgres(process.env.DATABASE_URL, { max: 3 });
    database = drizzle(client);
    state.database = database;
    chats = await import("./chats");
    await database.insert(hiker).values(people.map((person) => ({ ...person, password: "integration-test-unused" })));
    await database.insert(hike).values({ id: trailId, name: "Group integration test trail" });
    await database.insert(follow).values([
      ...people.slice(1, 15).map((person) => ({ followerId: people[0].id, followeeId: person.id })),
      { followerId: people[1].id, followeeId: people[0].id },
    ]);
  });

  afterAll(async () => {
    if (database) {
      if (groupIds.length) await database.delete(conversation).where(inArray(conversation.id, groupIds));
      await database.delete(hiker).where(inArray(hiker.id, people.map((person) => person.id)));
      await database.delete(hike).where(eq(hike.id, trailId));
    }
    if (client) await client.end();
  });

  it("persists groups, request decisions, multi-user messages and RSVPs without breaking other members", async () => {
    const [creator, follower, invited, followsLater, declines] = people;
    const outsider = people[16];
    state.user = creator;
    await expect(chats.createGroupConversation("Not followed", [people[1].id, outsider.id]))
      .rejects.toThrow("follow every hiker");
    const group = await chats.createGroupConversation("  Weekend hikes  ", people.slice(1, 5).map((person) => person.id));
    groupIds.push(group.id);
    expect(group).toMatchObject({ kind: "group", name: "Weekend hikes", creator: { id: creator.id }, isRequest: false });
    expect(group.members).toHaveLength(5);

    const maximum = await chats.createGroupConversation("x".repeat(100), people.slice(1, 15).map((person) => person.id));
    groupIds.push(maximum.id);
    expect(maximum.members).toHaveLength(15);
    expect(await database.select().from(conversationMember).where(eq(conversationMember.conversationId, maximum.id))).toHaveLength(15);
    await expect(chats.createGroupConversation("Too many", people.slice(1, 16).map((person) => person.id)))
      .rejects.toThrow("between 3 and 15");

    const migration = await readFile(new URL("../db/migrations/0004_group_chats.sql", import.meta.url), "utf8");
    await client.begin((tx) => tx.unsafe(migration));
    expect((await chats.getChatThreads()).find((thread) => thread.id === group.id)).toMatchObject({ name: "Weekend hikes" });

    state.user = follower;
    let view = (await chats.getChatThreads()).find((thread) => thread.id === group.id);
    expect(view).toMatchObject({ isRequest: false, unread: true, messages: [] });
    await chats.markChatRead(group.id);
    expect((await chats.getChatThreads()).find((thread) => thread.id === group.id)?.unread).toBe(false);

    state.user = invited;
    view = (await chats.getChatThreads()).find((thread) => thread.id === group.id);
    expect(view).toMatchObject({ isRequest: true, creator: { id: creator.id }, unread: true });
    await expect(chats.sendChatMessage(group.id, { kind: "text", text: "Not yet" })).rejects.toThrow("Accept this request");
    await expect(chats.respondToProposal(group.id, randomUUID(), "yes")).rejects.toThrow("Accept this request");

    state.user = outsider;
    expect(await chats.getChatThreads()).toEqual([]);
    await expect(chats.sendChatMessage(group.id, { kind: "text", text: "Intrusion" })).rejects.toThrow("cannot access");
    await expect(chats.markChatRead(group.id)).rejects.toThrow("cannot access");
    await expect(chats.updateChatRequest(group.id, "accept")).rejects.toThrow("cannot access");

    state.user = creator;
    await chats.sendChatMessage(group.id, { kind: "text", text: "Hello group" });
    const proposal = await chats.sendChatMessage(group.id, { kind: "proposal", trailId });
    state.user = invited;
    await chats.updateChatRequest(group.id, "accept");
    await chats.sendChatMessage(group.id, { kind: "text", text: "Hello from the invitee" });
    await chats.respondToProposal(group.id, proposal.id, "yes");
    state.user = follower;
    await chats.sendChatMessage(group.id, { kind: "text", text: "Hello from the follower" });
    await chats.respondToProposal(group.id, proposal.id, "yes");
    state.user = creator;
    view = (await chats.getChatThreads()).find((thread) => thread.id === group.id);
    expect(view?.messages).toEqual(expect.arrayContaining([
      expect.objectContaining({ text: "Hello from the invitee", sender: expect.objectContaining({ id: invited.id }) }),
      expect.objectContaining({ text: "Hello from the follower", sender: expect.objectContaining({ id: follower.id }) }),
      expect.objectContaining({ id: proposal.id, proposal: expect.objectContaining({
        rsvp: "yes", going: expect.arrayContaining([expect.objectContaining({ id: invited.id }), expect.objectContaining({ id: follower.id })]),
      }) }),
    ]));

    state.user = followsLater;
    expect((await chats.getChatThreads()).find((thread) => thread.id === group.id)?.isRequest).toBe(true);
    await database.insert(follow).values({ followerId: followsLater.id, followeeId: creator.id });
    expect((await chats.getChatThreads()).find((thread) => thread.id === group.id)?.isRequest).toBe(false);
    await chats.sendChatMessage(group.id, { kind: "text", text: "Following the creator" });
    await database.delete(follow).where(eq(follow.followerId, followsLater.id));
    expect((await chats.getChatThreads()).find((thread) => thread.id === group.id)?.isRequest).toBe(false);

    state.user = declines;
    await chats.updateChatRequest(group.id, "delete");
    expect((await chats.getChatThreads()).find((thread) => thread.id === group.id)).toBeUndefined();
    state.user = invited;
    await chats.updateChatRequest(group.id, "block");
    state.user = follower;
    await chats.sendChatMessage(group.id, { kind: "text", text: "The rest of the group can continue" });
    view = (await chats.getChatThreads()).find((thread) => thread.id === group.id);
    expect(view).toMatchObject({ blocked: false });
    if (view?.kind !== "group") throw new Error("Expected the group to remain available.");
    expect(view.members.map((person) => person.id)).not.toContain(invited.id);
    expect(view.members.map((person) => person.id)).not.toContain(declines.id);
    state.user = declines;
    expect((await chats.getChatThreads()).find((thread) => thread.id === group.id)).toBeUndefined();
    await expect(chats.sendChatMessage(group.id, { kind: "text", text: "After declining" })).rejects.toThrow("blocked");

    await database.delete(hiker).where(eq(hiker.id, creator.id));
    state.user = follower;
    view = (await chats.getChatThreads()).find((thread) => thread.id === group.id);
    expect(view).toMatchObject({ kind: "group", creator: null, isRequest: false });
    await chats.sendChatMessage(group.id, { kind: "text", text: "Group remains after account deletion" });

    state.user = null;
    await expect(chats.createGroupConversation("Expired", [people[1].id, people[2].id])).rejects.toThrow("NEXT_REDIRECT");
    await expect(chats.getChatThreads()).rejects.toThrow("NEXT_REDIRECT");
  }, 120000);
});
