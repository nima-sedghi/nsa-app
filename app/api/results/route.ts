import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { courses, professors, votes } from "@/lib/db/schema";
import { getVoterId } from "@/lib/voter";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const peek = searchParams.get("peek") === "1";
  const voterId = await getVoterId();

  const [allCourses, allProfessors, allVotes] = await Promise.all([
    db.select().from(courses),
    db.select().from(professors),
    db.select().from(votes),
  ]);

  const myVotes = allVotes.filter((v) => v.voterId === voterId);
  const votedCourseIds = new Set(myVotes.map((v) => v.courseId));

  const result = allCourses.map((course) => {
    const profs = allProfessors.filter((p) => p.courseId === course.id);
    const courseVotes = allVotes.filter((v) => v.courseId === course.id);
    // Revealed either because this browser already voted here, or because they
    // explicitly asked to just see results without voting ("peek" mode).
    const revealed = peek || votedCourseIds.has(course.id);
    const myVote = myVotes.find((v) => v.courseId === course.id)?.professorId ?? null;

    return {
      id: course.id,
      name: course.name,
      revealed,
      myVote,
      total: revealed ? courseVotes.length : null,
      professors: profs.map((p) => ({
        id: p.id,
        name: p.name,
        count: revealed ? courseVotes.filter((v) => v.professorId === p.id).length : null,
      })),
    };
  });

  return NextResponse.json({ courses: result });
}
