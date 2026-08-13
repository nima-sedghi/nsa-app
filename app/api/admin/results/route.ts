import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { courses, professors, votes } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const [allCourses, allProfessors, allVotes] = await Promise.all([
    db.select().from(courses),
    db.select().from(professors),
    db.select().from(votes),
  ]);

  const result = allCourses.map((course) => {
    const profs = allProfessors.filter((p) => p.courseId === course.id);
    const courseVotes = allVotes.filter((v) => v.courseId === course.id);
    return {
      id: course.id,
      name: course.name,
      total: courseVotes.length,
      professors: profs.map((p) => ({
        id: p.id,
        name: p.name,
        count: courseVotes.filter((v) => v.professorId === p.id).length,
      })),
    };
  });

  const stats = {
    totalCourses: allCourses.length,
    totalVotes: allVotes.length,
    totalVoters: new Set(allVotes.map((v) => v.studentId)).size,
  };

  return NextResponse.json({ courses: result, stats });
}
