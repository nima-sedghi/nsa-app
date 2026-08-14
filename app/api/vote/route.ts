import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { sql, eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { professors } from "@/lib/db/schema";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { getVoterId } from "@/lib/voter";

export const dynamic = "force-dynamic";

const VoteSchema = z.object({
  courseId: z.string().min(1),
  professorId: z.string().min(1),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  // Per-IP cap: slows down a script hammering the endpoint. A normal person voting
  // and changing their mind a few times will never come close to this.
  const okRate = await checkRateLimit(`vote:${ip}`, 20, 60);
  if (!okRate) {
    return NextResponse.json({ error: "تعداد درخواست زیاد بود، یکم صبر کن." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = VoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "ورودی نامعتبره" }, { status: 400 });
  }
  const { courseId, professorId } = parsed.data;
  const voterId = await getVoterId();

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

  // Atomic upsert keyed on (voter_id, course_id): voting again just updates this
  // browser's existing row instead of creating a second one. Enforced by Postgres
  // itself, so it can't be bypassed from the browser no matter what's sent.
  await db.execute(sql`
    INSERT INTO votes (id, voter_id, course_id, professor_id, created_at, updated_at)
    VALUES (${crypto.randomUUID()}, ${voterId}, ${courseId}, ${professorId}, now(), now())
    ON CONFLICT (voter_id, course_id)
    DO UPDATE SET professor_id = EXCLUDED.professor_id, updated_at = now();
  `);

  return NextResponse.json({ ok: true });
}
