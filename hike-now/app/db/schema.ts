import { 
  pgTable, 
  uuid, 
  varchar, 
  text, 
  decimal, 
  primaryKey,
  pgPolicy 
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// 1. HIKER 
export const hiker = pgTable(
  "hiker",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    password: varchar("password", { length: 255 }).notNull(),
    description: text("description"),
  },
  (table) => [
    pgPolicy("Public hikers are viewable by everyone", {
      for: "select",
      to: "public",
      using: sql`true`,
    }),
    pgPolicy("Users can update their own hiker profile", {
      for: "update",
      to: "authenticated",
      using: sql`auth.uid() = id`,
    }),
  ]
).enableRLS();

// 2. GROUP
export const group = pgTable(
  "group",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
  },
  () => [
    pgPolicy("Groups are viewable by everyone", {
      for: "select",
      to: "public",
      using: sql`true`,
    }),
  ]
).enableRLS();

// 3. MEMBER 
export const member = pgTable(
  "member",
  {
    hikerId: uuid("hiker_id")
      .notNull()
      .references(() => hiker.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => group.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.hikerId, table.groupId] }),
    pgPolicy("Memberships are viewable by everyone", {
      for: "select",
      to: "public",
      using: sql`true`,
    }),
    pgPolicy("Users can join groups", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`auth.uid() = hiker_id`,
    }),
  ]
).enableRLS();

// 4. FOLLOW 
export const follow = pgTable(
  "follow",
  {
    followerId: uuid("follower_id")
      .notNull()
      .references(() => hiker.id, { onDelete: "cascade" }),
    followeeId: uuid("followee_id")
      .notNull()
      .references(() => hiker.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.followerId, table.followeeId] }),
    pgPolicy("Follows are viewable by everyone", {
      for: "select",
      to: "public",
      using: sql`true`,
    }),
    pgPolicy("Users can follow others", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`auth.uid() = follower_id`,
    }),
  ]
).enableRLS();

// 5. HIKE
export const hike = pgTable(
  "hike",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    difficulty: varchar("difficulty", { length: 50 }),
    length: decimal("length", { precision: 10, scale: 2 }), // Fixed typo here
    equipment: text("equipment"),
    location: varchar("location", { length: 255 }),
    rating: decimal("rating", { precision: 3, scale: 2 }),
    landmarks: text("landmarks"),
  },
  (table) => [
    pgPolicy("Hikes are viewable by everyone", {
      for: "select",
      to: "public",
      using: sql`true`,
    }),
  ]
).enableRLS();

// 6. REVIEW 
export const review = pgTable(
  "review",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hikeId: uuid("hike_id")
      .notNull()
      .references(() => hike.id, { onDelete: "cascade" }),
    hikerId: uuid("hiker_id")
      .notNull()
      .references(() => hiker.id, { onDelete: "cascade" }),
    rating: decimal("rating", { precision: 3, scale: 2 }),
    tags: varchar("tags", { length: 255 }),
    photo: varchar("photo", { length: 255 }),
    condition: varchar("condition", { length: 255 }),
    comments: text("comments"),
  },
  (table) => [
    pgPolicy("Reviews are viewable by everyone", {
      for: "select",
      to: "public",
      using: sql`true`,
    }),
    pgPolicy("Users can create their own reviews", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`auth.uid() = hiker_id`,
    }),
  ]
).enableRLS();