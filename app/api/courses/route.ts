import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { db } from "@/lib/db";
import { courses, professors } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const courseRows = await db.select().from(courses);
  const profRows = await db.select().from(professors);
  const data = courseRows.map((c) => ({
    id: c.id,
    name: c.name,
    professors: profRows.filter((p) => p.courseId === c.id).map((p) => ({ id: p.id, name: p.name })),
  }));
  return NextResponse.json({ courses: data });
}

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  professors: z.array(z.string().trim().min(1).max(200)).min(2).max(20),
});

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "نام درس و حداقل دو استاد لازمه" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  await db.insert(courses).values({ id, name: parsed.data.name });
  const uniqueProfs = Array.from(new Set(parsed.data.professors));
  await db.insert(professors).values(uniqueProfs.map((name) => ({ id: crypto.randomUUID(), courseId: id, name })));

  return NextResponse.json({ ok: true, id });
}
