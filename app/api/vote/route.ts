import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { sql, eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { professors, allowedStudents, rosterConfig } from "@/lib/db/schema";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { normalizeId, isDigitsOnly } from "@/lib/utils";

export const dynamic = "force-dynamic";

const VoteSchema = z.object({
  studentId: z.string().min(1).max(30),
  courseId: z.string().min(1),
  professorId: z.string().min(1),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  // Per-IP cap: stops a script from hammering the endpoint with many fake IDs quickly.
  // Doesn't stop a patient human, but that's a social problem, not a code problem.
  const okRate = await checkRateLimit(`vote:${ip}`, 20, 60);
  if (!okRate) {
    return NextResponse.json({ error: "تعداد درخواست زیاد بود، یکم صبر کن." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = VoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "ورودی نامعتبره" }, { status: 400 });
  }

  const studentId = normalizeId(parsed.data.studentId);
  const { courseId, professorId } = parsed.data;

  if (!isDigitsOnly(studentId)) {
    return NextResponse.json({ error: "شماره دانشجویی باید فقط عدد باشه" }, { status: 400 });
  }

  const cfgRows = await db.select().from(rosterConfig).limit(1);
  const cfg = cfgRows[0] || { mode: "open", minLen: 8, maxLen: 10 };
  if (studentId.length < cfg.minLen || studentId.length > cfg.maxLen) {
    return NextResponse.json({ error: `شماره دانشجویی باید بین ${cfg.minLen} تا ${cfg.maxLen} رقم باشه` }, { status: 400 });
  }

  const knownRows = await db.select().from(allowedStudents).where(eq(allowedStudents.studentId, studentId)).limit(1);
  const known = knownRows.length > 0;
  if (cfg.mode === "closed" && !known) {
    return NextResponse.json({ error: "این شماره دانشجویی تو لیست از پیش تاییدشده نیست" }, { status: 403 });
  }

  // Professor must genuinely belong to the course being voted on — stops a tampered
  // client request from recording a vote for an unrelated professor/course pair.
  const profRows = await db
    .select()
    .from(professors)
    .where(and(eq(professors.id, professorId), eq(professors.courseId, courseId)))
    .limit(1);
  if (profRows.length === 0) {
    return NextResponse.json({ error: "این استاد برای این درس ثبت نشده" }, { status: 400 });
  }

  if (!known) {
    await db
      .insert(allowedStudents)
      .values({ id: crypto.randomUUID(), studentId })
      .onConflictDoNothing();
  }

  // Atomic upsert keyed on (student_id, course_id): a second vote from the same
  // student for the same course updates their existing row instead of creating a
  // duplicate. This is enforced by Postgres itself, so it can't be bypassed from
  // the browser no matter what the client sends.
  await db.execute(sql`
    INSERT INTO votes (id, student_id, course_id, professor_id, created_at, updated_at)
    VALUES (${crypto.randomUUID()}, ${studentId}, ${courseId}, ${professorId}, now(), now())
    ON CONFLICT (student_id, course_id)
    DO UPDATE SET professor_id = EXCLUDED.professor_id, updated_at = now();
  `);

  return NextResponse.json({ ok: true });
}
