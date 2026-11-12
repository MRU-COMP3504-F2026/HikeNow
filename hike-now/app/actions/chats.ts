"use server";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../db";
import { chatMessage, conversation, conversationMember, follow, hiker, hike } from "../db/schema";
import { getCurrentUser } from "../lib/session";
import { chatPerson } from "../chats/person";
import { MAX_GROUP_MEMBERS, MAX_GROUP_NAME_LENGTH, MIN_GROUP_MEMBERS } from "../chats/constants";
import { nextSaturdayLabel } from "../chats/utils";
import type { ChatContent, ChatMessage, ChatThread, GroupChatThread, Rsvp, SendChatInput, TrailShare } from "../chats/types";

type ChatDatabase = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

function requireId(id: string) {
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("Invalid hiker or conversation ID.");
  }
}

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

async function membersFor(database: ChatDatabase, id: string, userId: string) {
  requireId(id);
  const [room] = await database.select().from(conversation).where(eq(conversation.id, id));
  const members = await database.select().from(conversationMember)
    .where(eq(conversationMember.conversationId, id))
    .orderBy(asc(conversationMember.hikerId)).for("update");
  const own = members.find((member) => member.hikerId === userId);
  if (!room || !own) throw new Error("You cannot access this conversation.");
  if (own.blocked || (room.kind === "direct" && members.some((member) => member.blocked))) {
    throw new Error("This conversation is blocked.");
  }
  if (room.kind === "direct" && !members.some((member) => member.hikerId !== userId)) {
    throw new Error("You cannot access this conversation.");
  }
  return { room, own, members };
}

async function mayReply(
  database: ChatDatabase,
  room: typeof conversation.$inferSelect,
  own: typeof conversationMember.$inferSelect,
  members: (typeof conversationMember.$inferSelect)[],
) {
  if (own.accepted) return true;
  const senderId = room.kind === "group"
    ? room.createdBy
    : members.find((member) => member.hikerId !== own.hikerId)?.hikerId;
  if (!senderId) return false;
  const [relation] = await database.select().from(follow)
    .where(and(eq(follow.followerId, own.hikerId), eq(follow.followeeId, senderId)));
  return Boolean(relation);
}

function memberWhere(id: string, userId: string) {
  return and(eq(conversationMember.conversationId, id), eq(conversationMember.hikerId, userId));
}

function trailShare(trail: typeof hike.$inferSelect): TrailShare {
  return {
    id: trail.id, name: trail.name, location: trail.location ?? "",
    rating: Number(trail.rating ?? 0), lengthKm: Number(trail.length ?? 0),
    difficulty: trail.difficulty ?? "", imageUrl: trail.photo ?? "",
  };
}

export async function getChatThreads(): Promise<ChatThread[]> {
  const user = await requireUser();
  const rows = await db.select({
    room: conversation, membership: conversationMember,
  }).from(conversationMember)
    .innerJoin(conversation, eq(conversation.id, conversationMember.conversationId))
    .where(and(eq(conversationMember.hikerId, user.id), eq(conversationMember.hidden, false)));
  if (!rows.length) return [];
  const [messages, following, memberships] = await Promise.all([
    db.select().from(chatMessage).where(inArray(chatMessage.conversationId, rows.map((row) => row.room.id)))
      .orderBy(asc(chatMessage.createdAt), asc(chatMessage.id)),
    db.select().from(follow).where(eq(follow.followerId, user.id)),
    db.select({
      membership: conversationMember,
      person: { id: hiker.id, email: hiker.email, displayName: hiker.displayName },
    }).from(conversationMember)
      .innerJoin(hiker, eq(hiker.id, conversationMember.hikerId))
      .where(inArray(conversationMember.conversationId, rows.map((row) => row.room.id))),
  ]);
  const followed = new Set(following.map((row) => row.followeeId));
  return rows.map(({ room, membership }) => {
    const roster = memberships.filter((entry) => entry.membership.conversationId === room.id);
    const other = roster.find((entry) => entry.person.id !== user.id);
    const creator = roster.find((entry) => entry.person.id === room.createdBy);
    const requestSenderId = room.kind === "group" ? room.createdBy : other?.person.id;
    const roomMessages = messages.filter((message) => message.conversationId === room.id);
    const latest = roomMessages.at(-1);
    const common = {
      id: room.id,
      blocked: membership.blocked || (room.kind === "direct" && roster.some((entry) => entry.membership.blocked)),
      isRequest: !membership.accepted && (!requestSenderId || !followed.has(requestSenderId)),
      time: latest ? latest.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "",
      unread: (room.kind === "group" && room.createdBy !== user.id && !membership.readAt) ||
        roomMessages.some((message) => message.senderId !== user.id && (!membership.readAt || message.createdAt > membership.readAt)),
      messages: roomMessages.map((message) => {
        const content = message.content;
        const from = message.senderId === user.id ? "me" as const : "them" as const;
        const author = roster.find((entry) => entry.person.id === message.senderId);
        if (!author) throw new Error("A chat message has no matching participant.");
        const sender = chatPerson(author.person);
        if (content.kind === "proposal") {
          return { id: message.id, from, sender, kind: "proposal" as const, proposal: {
            ...content.proposal,
            rsvp: message.responses[user.id] ?? "none",
            going: roster.filter((entry) => !entry.membership.blocked && entry.person.id !== user.id &&
              message.responses[entry.person.id] === "yes").map((entry) => chatPerson(entry.person)),
          }};
        }
        return { ...content, id: message.id, from, sender };
      }),
      updatedAt: latest?.createdAt.getTime() ?? room.createdAt.getTime(),
    };
    if (room.kind === "group") {
      if (!room.groupName) throw new Error("A group conversation has no name.");
      const members = roster.filter((entry) => !entry.membership.blocked).map((entry) => chatPerson(entry.person));
      return {
        ...common, kind: "group" as const, name: room.groupName,
        creator: creator ? chatPerson(creator.person) : null,
        members, context: `${members.length} members`,
      };
    }
    if (!other) throw new Error("A direct conversation has no other participant.");
    return {
      ...common, kind: "direct" as const, person: chatPerson(other.person),
      following: followed.has(other.person.id), context: "Direct conversation",
    };
  }).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getChatData() {
  const user = await requireUser();
  const [threads, contacts, trails] = await Promise.all([
    getChatThreads(),
    db.select({ id: hiker.id, email: hiker.email, displayName: hiker.displayName }).from(follow)
      .innerJoin(hiker, eq(hiker.id, follow.followeeId)).where(eq(follow.followerId, user.id)),
    db.select().from(hike),
  ]);
  return { threads, contacts: contacts.map(chatPerson), trails: trails.map(trailShare), me: chatPerson(user) };
}

export async function startConversation(personId: string) {
  const user = await requireUser();
  requireId(personId);
  personId = personId.toLowerCase();
  if (personId === user.id) throw new Error("You cannot message yourself.");
  const [relation] = await db.select().from(follow)
    .where(and(eq(follow.followerId, user.id), eq(follow.followeeId, personId)));
  if (!relation) throw new Error("Follow this hiker before starting a conversation.");
  const id = await db.transaction(async (tx) => {
    const [hikerLow, hikerHigh] = [user.id, personId].sort();
    const [room] = await tx.insert(conversation).values({ hikerLow, hikerHigh })
      .onConflictDoUpdate({ target: [conversation.hikerLow, conversation.hikerHigh], set: { hikerLow } }).returning();
    await tx.insert(conversationMember).values([
      { conversationId: room.id, hikerId: user.id, accepted: true },
      { conversationId: room.id, hikerId: personId, hidden: true },
    ]).onConflictDoNothing();
    await membersFor(tx, room.id, user.id);
    await tx.update(conversationMember).set({ accepted: true, hidden: false })
      .where(memberWhere(room.id, user.id));
    return room.id;
  });
  revalidatePath("/chats");
  return id;
}

export async function createGroupConversation(name: string, inviteeIds: string[]): Promise<GroupChatThread> {
  const user = await requireUser();
  if (typeof name !== "string" || !name.trim() || name.trim().length > MAX_GROUP_NAME_LENGTH) {
    throw new Error(`Group names must contain between 1 and ${MAX_GROUP_NAME_LENGTH} characters.`);
  }
  if (!Array.isArray(inviteeIds) || inviteeIds.length < MIN_GROUP_MEMBERS - 1 ||
    inviteeIds.length > MAX_GROUP_MEMBERS - 1) {
    throw new Error(`Groups must have between ${MIN_GROUP_MEMBERS} and ${MAX_GROUP_MEMBERS} members.`);
  }
  for (const id of inviteeIds) requireId(id);
  const ids = inviteeIds.map((id) => id.toLowerCase());
  if (new Set(ids).size !== ids.length || ids.includes(user.id.toLowerCase())) {
    throw new Error("Choose different hikers other than yourself.");
  }

  return await db.transaction(async (tx) => {
    const selected = await tx.select({ id: hiker.id, email: hiker.email, displayName: hiker.displayName }).from(follow)
      .innerJoin(hiker, eq(hiker.id, follow.followeeId))
      .where(and(eq(follow.followerId, user.id), inArray(follow.followeeId, ids)))
      .orderBy(asc(follow.followeeId)).for("share");
    if (selected.length !== ids.length) {
      throw new Error("You must follow every hiker you invite.");
    }
    const reciprocal = await tx.select({ id: follow.followerId }).from(follow)
      .where(and(eq(follow.followeeId, user.id), inArray(follow.followerId, ids)));
    const followers = new Set(reciprocal.map((entry) => entry.id));
    const [room] = await tx.insert(conversation).values({
      kind: "group", groupName: name.trim(), createdBy: user.id,
    }).returning();
    await tx.insert(conversationMember).values([
      { conversationId: room.id, hikerId: user.id, accepted: true, readAt: new Date() },
      ...ids.map((hikerId) => ({
        conversationId: room.id, hikerId, accepted: followers.has(hikerId),
      })),
    ]);
    const creator = chatPerson(user);
    const members = [creator, ...selected.map(chatPerson)];
    return {
      id: room.id, kind: "group", name: name.trim(), creator, members,
      context: `${members.length} members`, isRequest: false, blocked: false,
      time: "", unread: false, messages: [],
    };
  });
}

export async function sendChatMessage(id: string, input: SendChatInput, messageId?: string): Promise<ChatMessage> {
  const user = await requireUser();
  requireId(id);
  id = id.toLowerCase();
  if (messageId !== undefined) {
    requireId(messageId);
    messageId = messageId.toLowerCase();
  }
  if (!input || typeof input !== "object") throw new Error("Invalid message.");
  if (input.kind === "text") {
    if (typeof input.text !== "string" || !input.text.trim() || input.text.trim().length > 4000) {
      throw new Error("Messages must contain between 1 and 4000 characters.");
    }
  } else if (input.kind === "trail" || input.kind === "proposal") {
    requireId(input.trailId);
  } else {
    throw new Error("Unsupported message type.");
  }
  return await db.transaction(async (tx) => {
    const { room, own, members } = await membersFor(tx, id, user.id);
    if (!await mayReply(tx, room, own, members)) throw new Error("Accept this request before replying.");
    if (messageId) {
      const [existing] = await tx.select().from(chatMessage).where(eq(chatMessage.id, messageId));
      if (existing) {
        if (existing.conversationId !== id || existing.senderId !== user.id) {
          throw new Error("This message ID is already in use.");
        }
        const sender = chatPerson(user);
        return existing.content.kind === "proposal"
          ? { id: existing.id, from: "me", sender, kind: "proposal", proposal: {
            ...existing.content.proposal, rsvp: existing.responses[user.id] ?? "none",
          } }
          : { ...existing.content, id: existing.id, from: "me", sender };
      }
    }
    let content: ChatContent;
    if (input.kind === "text") {
      content = { kind: "text", text: input.text.trim() };
    } else {
      const [trail] = await tx.select().from(hike).where(eq(hike.id, input.trailId));
      if (!trail) throw new Error("This trail no longer exists.");
      content = input.kind === "trail" ? { kind: "trail", trail: trailShare(trail) } : {
        kind: "proposal", proposal: {
          trailName: trail.name, when: nextSaturdayLabel(), where: `${trail.name} trailhead`,
          going: [], rsvp: "none",
        },
      };
    }
    const [saved] = await tx.insert(chatMessage).values({
      id: messageId, conversationId: id, senderId: user.id, content,
      responses: content.kind === "proposal" ? { [user.id]: "yes" } : {},
    }).onConflictDoNothing({ target: chatMessage.id }).returning();
    if (!saved) throw new Error("This message ID is already in use.");
    await tx.update(conversationMember).set({ hidden: false })
      .where(and(eq(conversationMember.conversationId, id), eq(conversationMember.blocked, false)));
    await tx.update(conversationMember).set({ accepted: true, readAt: new Date() }).where(memberWhere(id, user.id));
    const sender = chatPerson(user);
    return content.kind === "proposal"
      ? { id: saved.id, from: "me", sender, kind: "proposal", proposal: { ...content.proposal, rsvp: "yes" } }
      : { ...content, id: saved.id, from: "me", sender };
  });
}

export async function updateChatRequest(id: string, action: "accept" | "delete" | "block") {
  const user = await requireUser();
  if (!["accept", "delete", "block"].includes(action)) throw new Error("Invalid request action.");
  await db.transaction(async (tx) => {
    const { room } = await membersFor(tx, id, user.id);
    await tx.update(conversationMember).set(action === "accept"
      ? { accepted: true, hidden: false, readAt: new Date() }
      : { hidden: true, blocked: room.kind === "group" || action === "block" }).where(memberWhere(id, user.id));
  });
}

export async function markChatRead(id: string) {
  const user = await requireUser();
  await db.transaction(async (tx) => {
    const { room, own, members } = await membersFor(tx, id, user.id);
    if (await mayReply(tx, room, own, members)) {
      await tx.update(conversationMember).set({ accepted: true, readAt: new Date() }).where(memberWhere(id, user.id));
    }
  });
}

export async function respondToProposal(id: string, messageId: string, value: Rsvp) {
  const user = await requireUser();
  requireId(messageId);
  if (!["none", "yes", "no"].includes(value)) throw new Error("Invalid RSVP.");
  await db.transaction(async (tx) => {
    const { room, own, members } = await membersFor(tx, id, user.id);
    if (!await mayReply(tx, room, own, members)) throw new Error("Accept this request before responding.");
    const [message] = await tx.select().from(chatMessage)
      .where(and(eq(chatMessage.id, messageId), eq(chatMessage.conversationId, id)));
    if (!message || message.content.kind !== "proposal") throw new Error("Hike proposal not found.");
    await tx.update(chatMessage).set({
      responses: sql`${chatMessage.responses} || ${JSON.stringify({ [user.id]: value })}::jsonb`,
    }).where(eq(chatMessage.id, messageId));
  });
}
