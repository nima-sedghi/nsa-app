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

// Collapses repeated/odd whitespace so "ریاضی  عمومی" and "ریاضی عمومی" match as the
// same course across two different exports, instead of creating a duplicate.
function normalizeCourseName(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

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
  // Professors currently on a course that the new file didn't mention for that same
  // course name — probably means they're not teaching it this term. We only report
  // this, never auto-delete: an incomplete or partial file shouldn't silently wipe
  // someone off the list. The admin reviews and removes manually if it's correct.
  const possiblyStale: { course: string; professors: string[] }[] = [];

  for (const g of parsed.data.groups) {
    const uniqueProfs = Array.from(new Set(g.professors));
    if (uniqueProfs.length < 2) {
      skipped.push({ course: g.name, professors: uniqueProfs });
      continue;
    }
    const existing = existingCourses.find((c) => normalizeCourseName(c.name) === normalizeCourseName(g.name));
    if (!existing) {
      const cid = crypto.randomUUID();
      await db.insert(courses).values({ id: cid, name: g.name });
      await db.insert(professors).values(uniqueProfs.map((name) => ({ id: crypto.randomUUID(), courseId: cid, name })));
      added += 1;
    } else {
      const currentProfNames = existingProfs.filter((p) => p.courseId === existing.id).map((p) => p.name);
      const currentNames = new Set(currentProfNames);
      const newFileNames = new Set(uniqueProfs);

      const newOnes = uniqueProfs.filter((n) => !currentNames.has(n));
      if (newOnes.length > 0) {
        await db.insert(professors).values(newOnes.map((name) => ({ id: crypto.randomUUID(), courseId: existing.id, name })));
        updated += 1;
      }

      const stale = currentProfNames.filter((n) => !newFileNames.has(n));
      if (stale.length > 0) {
        possiblyStale.push({ course: g.name, professors: stale });
      }
    }
  }

  return NextResponse.json({ added, updated, skipped, possiblyStale });
}
