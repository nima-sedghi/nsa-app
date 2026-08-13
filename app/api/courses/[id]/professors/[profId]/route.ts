import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { professors } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; profId: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id, profId } = await params;

  const remaining = await db.select().from(professors).where(eq(professors.courseId, id));
  if (remaining.length <= 2) {
    return NextResponse.json({ error: "هر درس حداقل باید دو استاد داشته باشه" }, { status: 400 });
  }

  await db.delete(professors).where(and(eq(professors.id, profId), eq(professors.courseId, id)));
  return NextResponse.json({ ok: true });
}
