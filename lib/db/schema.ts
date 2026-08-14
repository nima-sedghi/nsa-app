import { pgTable, text, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";

export const courses = pgTable("courses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const professors = pgTable("professors", {
  id: text("id").primaryKey(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
});

// voterId is a random UUID the server assigns to each browser on first visit (via an
// httpOnly cookie set in middleware.ts) — not a typed student number. The unique index
// on (voterId, courseId) is what actually stops double voting, enforced by Postgres
// itself: a second vote from the same browser updates their row instead of adding one.
export const votes = pgTable(
  "votes",
  {
    id: text("id").primaryKey(),
    voterId: text("voter_id").notNull(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    professorId: text("professor_id")
      .notNull()
      .references(() => professors.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    uniqVoterCourse: uniqueIndex("uniq_voter_course").on(t.voterId, t.courseId),
  })
);

// DB-backed rate limiting so it works correctly across serverless function instances.
export const rateLimitBuckets = pgTable("rate_limit_buckets", {
  id: text("id").primaryKey(), // `${key}:${windowStartMs}`
  windowStart: timestamp("window_start").notNull(),
  count: integer("count").notNull().default(1),
});
