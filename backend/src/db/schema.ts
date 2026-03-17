import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  integer,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
  jsonb,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ── Enums ────────────────────────────────────────────────────────────────────

export const companionStatusEnum = pgEnum('companion_status', ['pending', 'accepted']);

export const notificationTypeEnum = pgEnum('notification_type', [
  'companion_request',
  'companion_accepted',
  'room_invite',
]);

// ── users ────────────────────────────────────────────────────────────────────
// education and workExperience are single-object embeds → jsonb.
// projects is an array of objects → also jsonb.
// Preserves schema parity with the former Mongoose model.

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    bio: text('bio').default(''),
    avatar: text('avatar').default(''),
    googleId: varchar('google_id', { length: 255 }),
    education: jsonb('education').default({ degree: '', institution: '', year: '' }),
    projects: jsonb('projects').default([]),
    workExperience: jsonb('work_experience').default({
      company: '',
      role: '',
      duration: '',
      description: '',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('users_email_unique_idx').on(table.email)],
);

// ── rooms ────────────────────────────────────────────────────────────────────
// Personal rooms are implicit (no DB row). This table is for API-created rooms.

export const rooms = pgTable('rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// room_members: replaces the MongoDB rooms.users[] array
export const roomMembers = pgTable(
  'room_members',
  {
    roomId: uuid('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.roomId, table.userId] }),
    index('room_members_user_idx').on(table.userId),
  ],
);

// ── companions ───────────────────────────────────────────────────────────────

export const companions = pgTable(
  'companions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requesterId: uuid('requester_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: companionStatusEnum('status').default('pending').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('companions_requester_recipient_unique_idx').on(
      table.requesterId,
      table.recipientId,
    ),
    index('companions_recipient_idx').on(table.recipientId),
    index('companions_status_idx').on(table.status),
  ],
);

// ── notifications ────────────────────────────────────────────────────────────
// No native PostgreSQL TTL — daily cron job deletes rows older than 10 days.
// `data` is jsonb for the mixed `data` field (e.g. { roomId } for room_invite).

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    fromUserId: varchar('from_user_id', { length: 255 }).notNull(),
    fromUserName: text('from_user_name').notNull(),
    data: jsonb('data'),
    read: boolean('read').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('notifications_recipient_idx').on(table.recipientId),
    index('notifications_recipient_read_idx').on(table.recipientId, table.read),
    index('notifications_created_at_idx').on(table.createdAt),
  ],
);

// ── upload_counters ──────────────────────────────────────────────────────────

export const uploadCounters = pgTable(
  'upload_counters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: varchar('user_id', { length: 255 }).notNull(),
    monthKey: varchar('month_key', { length: 7 }).notNull(), // "2026-03"
    count: integer('count').default(0).notNull(),
  },
  (table) => [
    uniqueIndex('upload_counters_user_month_unique_idx').on(table.userId, table.monthKey),
  ],
);

// ── embedding_counters ───────────────────────────────────────────────────────

export const embeddingCounters = pgTable(
  'embedding_counters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dateKey: varchar('date_key', { length: 10 }).notNull(), // "2026-03-08"
    count: integer('count').default(0).notNull(),
  },
  (table) => [uniqueIndex('embedding_counters_date_key_unique_idx').on(table.dateKey)],
);

// ── direct_messages ──────────────────────────────────────────────────────────

export const directMessages = pgTable(
  'direct_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fromId: uuid('from_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    toId: uuid('to_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    read: boolean('read').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('dm_from_to_idx').on(table.fromId, table.toId),
    index('dm_to_from_idx').on(table.toId, table.fromId),
    index('dm_to_read_idx').on(table.toId, table.read),
    index('dm_created_at_idx').on(table.createdAt),
  ],
);

// ── chats ────────────────────────────────────────────────────────────────────
// roomId stays varchar — logical room string like "user_abc" (no FK needed).
// sessionId is a UUID string from crypto.randomUUID() on the client.

export const chats = pgTable(
  'chats',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sendById: uuid('send_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    senderName: text('sender_name').notNull(),
    message: text('message').notNull(),
    roomId: varchar('room_id', { length: 255 }).notNull(),
    sessionId: varchar('session_id', { length: 36 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('chats_room_created_at_idx').on(table.roomId, table.createdAt)],
);

// ── Drizzle relations (type-safe joins) ──────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  roomMembers: many(roomMembers),
  sentMessages: many(directMessages, { relationName: 'sentMessages' }),
  receivedMessages: many(directMessages, { relationName: 'receivedMessages' }),
  companionsAsRequester: many(companions, { relationName: 'companionsAsRequester' }),
  companionsAsRecipient: many(companions, { relationName: 'companionsAsRecipient' }),
  notifications: many(notifications),
  chats: many(chats),
}));

export const roomsRelations = relations(rooms, ({ many }) => ({
  members: many(roomMembers),
}));

export const roomMembersRelations = relations(roomMembers, ({ one }) => ({
  room: one(rooms, { fields: [roomMembers.roomId], references: [rooms.id] }),
  user: one(users, { fields: [roomMembers.userId], references: [users.id] }),
}));

export const companionsRelations = relations(companions, ({ one }) => ({
  requester: one(users, {
    fields: [companions.requesterId],
    references: [users.id],
    relationName: 'companionsAsRequester',
  }),
  recipient: one(users, {
    fields: [companions.recipientId],
    references: [users.id],
    relationName: 'companionsAsRecipient',
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(users, { fields: [notifications.recipientId], references: [users.id] }),
}));

export const directMessagesRelations = relations(directMessages, ({ one }) => ({
  from: one(users, {
    fields: [directMessages.fromId],
    references: [users.id],
    relationName: 'sentMessages',
  }),
  to: one(users, {
    fields: [directMessages.toId],
    references: [users.id],
    relationName: 'receivedMessages',
  }),
}));

export const chatsRelations = relations(chats, ({ one }) => ({
  sendBy: one(users, { fields: [chats.sendById], references: [users.id] }),
}));

// ── Inferred types (used in query helpers and controllers) ───────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Companion = typeof companions.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type DirectMessage = typeof directMessages.$inferSelect;
export type Chat = typeof chats.$inferSelect;
export type UploadCounter = typeof uploadCounters.$inferSelect;
export type EmbeddingCounter = typeof embeddingCounters.$inferSelect;
