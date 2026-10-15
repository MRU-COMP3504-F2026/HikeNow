import { 
  pgTable, 
  serial, 
  varchar, 
  text, 
  integer, 
  decimal, 
  primaryKey 
} from "drizzle-orm/pg-core";

// HIKER
export const hiker = pgTable("hiker", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  description: text("description"),
});

// GROUP
export const group = pgTable("group", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
});

// MEMBER
export const member = pgTable("member", {
  hikerId: integer("hiker_id")
    .notNull()
    .references(() => hiker.id, { onDelete: "cascade" }),
  groupId: integer("group_id")
    .notNull()
    .references(() => group.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: primaryKey({ columns: [table.hikerId, table.groupId] }),
}));

//  FOLLOW 
export const follow = pgTable("follow", {
  followerId: integer("follower_id")
    .notNull()
    .references(() => hiker.id, { onDelete: "cascade" }),
  followeeId: integer("followee_id")
    .notNull()
    .references(() => hiker.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: primaryKey({ columns: [table.followerId, table.followeeId] }),
}));

// HIKE
export const hike = pgTable("hike", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  difficulty: varchar("difficulty", { length: 50 }),
  lenght: decimal("lenght", { precision: 10, scale: 2 }), 
  equipment: text("equipment"),
  location: varchar("location", { length: 255 }),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  landmarks: text("landmarks"),
});

// REVIEW 
export const review = pgTable("review", {
  id: serial("id").primaryKey(),
  hikeId: integer("hike_id")
    .notNull()
    .references(() => hike.id, { onDelete: "cascade" }),
  hikerId: integer("hiker_id")
    .notNull()
    .references(() => hiker.id, { onDelete: "cascade" }),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  tags: varchar("tags", { length: 255 }),
  photo: varchar("photo", { length: 255 }),
  condition: varchar("condition", { length: 255 }),
  comments: text("comments"),
});