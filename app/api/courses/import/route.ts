import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { db } from "@/lib/db";
import { courses, professors } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const Schema = z.object({
  groups: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        professors: z.array(z.string().trim().min(1).max(200)),
      })
    )
    .max(500),
});

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "ورودی نامعتبره" }, { status: 400 });

  const existingCourses = await db.select().from(courses);
  const existingProfs = await db.select().from(professors);

  let added = 0;
  let updated = 0;
  const skipped: { course: string; professors: string[] }[] = [];

  for (const g of parsed.data.groups) {
    const uniqueProfs = Array.from(new Set(g.professors));
    if (uniqueProfs.length < 2) {
      skipped.push({ course: g.name, professors: uniqueProfs });
      continue;
    }
    const existing = existingCourses.find((c) => c.name.trim() === g.name.trim());
    if (!existing) {
      const cid = crypto.randomUUID();
      await db.insert(courses).values({ id: cid, name: g.name });
      await db.insert(professors).values(uniqueProfs.map((name) => ({ id: crypto.randomUUID(), courseId: cid, name })));
      added += 1;
    } else {
      const currentNames = new Set(existingProfs.filter((p) => p.courseId === existing.id).map((p) => p.name));
      const newOnes = uniqueProfs.filter((n) => !currentNames.has(n));
      if (newOnes.length > 0) {
        await db.insert(professors).values(newOnes.map((name) => ({ id: crypto.randomUUID(), courseId: existing.id, name })));
        updated += 1;
      }
    }
  }

  return NextResponse.json({ added, updated, skipped });
}
