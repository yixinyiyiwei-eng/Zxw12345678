import { pgTable, serial, date, text, timestamp, unique, check, integer, varchar, numeric, boolean, index, time } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const moneyInsights = pgTable("money_insights", {
	id: serial().primaryKey().notNull(),
	date: date().default(sql`CURRENT_DATE`).notNull(),
	observation: text().notNull(),
	thought: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("money_insights_date_idx").on(table.date),
]);

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const dailyReviews = pgTable("daily_reviews", {
	id: serial().primaryKey().notNull(),
	date: date().default(sql`CURRENT_DATE`).notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("daily_reviews_date_key").on(table.date),
]);

export const goals = pgTable("goals", {
	id: serial().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	progress: integer().default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	check("goals_progress_check", sql`(progress >= 0) AND (progress <= 100)`),
]);

export const subGoals = pgTable("sub_goals", {
	id: serial().primaryKey().notNull(),
	goalId: integer("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
	title: text().notNull(),
	isCompleted: boolean("is_completed").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("sub_goals_goal_id_idx").on(table.goalId),
]);

export const transactions = pgTable("transactions", {
	id: serial().primaryKey().notNull(),
	date: date().default(sql`CURRENT_DATE`).notNull(),
	type: varchar({ length: 10 }).notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	category: varchar({ length: 50 }).notNull(),
	description: text(),
	isInvoiced: boolean("is_invoiced").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	check("transactions_type_check", sql`(type)::text = ANY ((ARRAY['income'::character varying, 'expense'::character varying])::text[])`),
	check("transactions_category_check", sql`(category)::text = ANY ((ARRAY['work'::character varying, 'life'::character varying])::text[])`),
	index("transactions_date_idx").on(table.date),
	index("transactions_type_idx").on(table.type),
]);

export const englishNotes = pgTable("english_notes", {
	id: serial().primaryKey().notNull(),
	date: date().default(sql`CURRENT_DATE`).notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("english_notes_date_idx").on(table.date),
]);

export const aiLearningNotes = pgTable("ai_learning_notes", {
	id: serial().primaryKey().notNull(),
	date: date().default(sql`CURRENT_DATE`).notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("ai_learning_notes_date_key").on(table.date),
]);

export const readingNotes = pgTable("reading_notes", {
	id: serial().primaryKey().notNull(),
	date: date().default(sql`CURRENT_DATE`).notNull(),
	title: text(),
	source: text(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("reading_notes_date_idx").on(table.date),
]);

export const dailyPlans = pgTable("daily_plans", {
	id: serial().primaryKey().notNull(),
	date: date().default(sql`CURRENT_DATE`).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("daily_plans_date_key").on(table.date),
]);

export const planItems = pgTable("plan_items", {
	id: serial().primaryKey().notNull(),
	planId: integer("plan_id").notNull().references(() => dailyPlans.id, { onDelete: "cascade" }),
	title: text().notNull(),
	scheduledTime: time("scheduled_time"),
	status: varchar({ length: 20 }).default("pending").notNull(),
	postponeUntil: timestamp("postpone_until", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("plan_items_plan_id_idx").on(table.planId),
	index("plan_items_status_idx").on(table.status),
	check("plan_items_status_check", sql`(status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'postponed'::character varying])::text[])`),
]);
