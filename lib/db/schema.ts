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

// The unique index on (studentId, courseId) is what actually stops double voting —
// enforced by Postgres itself, not by client-side JS that a bad-faith user could edit.
export const votes = pgTable(
  "votes",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id").notNull(),
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
    uniqStudentCourse: uniqueIndex("uniq_student_course").on(t.studentId, t.courseId),
  })
);

export const allowedStudents = pgTable("allowed_students", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rosterConfig = pgTable("roster_config", {
  id: integer("id").primaryKey(),
  mode: text("mode").notNull().default("open"),
  minLen: integer("min_len").notNull().default(8),
  maxLen: integer("max_len").notNull().default(10),
});

// DB-backed rate limiting so it works correctly across serverless function instances
// (an in-memory counter would reset per cold start and wouldn't share state).
export const rateLimitBuckets = pgTable("rate_limit_buckets", {
  id: text("id").primaryKey(), // `${key}:${windowStartMs}`
  windowStart: timestamp("window_start").notNull(),
  count: integer("count").notNull().default(1),
});
