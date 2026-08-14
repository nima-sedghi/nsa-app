import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { votes } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Clears every vote across every course — for rolling over to a new term without
// having to clear each course one by one. Courses and professors are untouched.
export async function DELETE() {
  const denied = await requireAdmin();
  if (denied) return denied;

  await db.delete(votes);
  return NextResponse.json({ ok: true });
}
