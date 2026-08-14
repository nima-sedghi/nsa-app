"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type Professor = { id: string; name: string; count: number | null };
type Course = { id: string; name: string; revealed: boolean; myVote: string | null; total: number | null; professors: Professor[] };

const LEADER_TAGS = ["فعلاً داره می‌بره", "نفر اول فعلی", "بیشترین رای تا الان"];

export default function VotePage() {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [peek, setPeek] = useState(false);
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [busyCourseId, setBusyCourseId] = useState<string | null>(null);

  const showToast = (msg: string) => setToast(msg);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const loadResults = async (p: boolean) => {
    const data = await api.getResults(p);
    setCourses(data.courses);
  };

  useEffect(() => {
    loadResults(peek).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live-ish sync so results feel current without a manual refresh.
  useEffect(() => {
    const interval = setInterval(() => {
      loadResults(peek).catch(() => {});
    }, 6000);
    return () => clearInterval(interval);
  }, [peek]);

  const togglePeek = async () => {
    const next = !peek;
    setPeek(next);
    await loadResults(next);
  };

  const castVote = async (courseId: string, professorId: string) => {
    setBusyCourseId(courseId);
    try {
      await api.vote(courseId, professorId);
      await loadResults(peek);
      showToast("ثبت شد ✌️");
    } catch (e: any) {
      showToast(e.message || "یه خطایی پیش اومد");
    } finally {
      setBusyCourseId(null);
    }
  };

  const filtered = useMemo(() => {
    if (!courses) return [];
    const q = query.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) => c.name.toLowerCase().includes(q) || c.professors.some((p) => p.name.toLowerCase().includes(q))
    );
  }, [courses, query]);

  return (
    <div className="min-h-screen pb-16">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gold text-inkdark px-4 py-2 rounded font-semibold text-sm animate-popIn">
          {toast}
        </div>
      )}

      <header className="border-b border-border px-4 pt-8 pb-6 sm:px-6 animate-fadeIn">
        <div className="max-w-3xl mx-auto">
          <div className="font-mono text-[11px] tracking-widest text-gold mb-2">نظرسنجی دانشجویی</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-2">کدوم استاد رو برداریم؟ 🤔</h1>
          <p className="text-sm text-slate-300 leading-7 max-w-md">
            رو هر درس بزن رو اسم استادی که می‌خوای. نتیجه رو بعد از رای‌دادن (یا با دکمه‌ی پایین) می‌بینی. رایتم هروقت خواستی می‌تونی عوض کنی.
          </p>
        </div>

        {courses && (
          <div className="max-w-3xl mx-auto flex gap-3 flex-wrap mt-5 items-center">
            <StatChip label="تعداد درس" value={courses.length} />
            <StatChip label="مجموع آرا" value={courses.reduce((s, c) => s + (c.total ?? 0), 0)} />
            <button
              onClick={togglePeek}
              className={`text-xs px-4 py-2 rounded-full border transition-all active:scale-95 ${
                peek ? "bg-gold text-inkdark border-gold" : "border-border text-parchmentlight hover:bg-panel"
              }`}
            >
              {peek ? "نتایج نشون داده میشه 👀" : "فقط نتیجه رو نشونم بده"}
            </button>
          </div>
        )}
        <div
          className="max-w-3xl mx-auto mt-6 h-px"
          style={{ background: "repeating-linear-gradient(to left, #4A5A85 0 8px, transparent 8px 16px)" }}
        />
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
        <input
          placeholder="جست‌وجوی درس یا استاد…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-4 py-2.5 rounded-full border border-border bg-panel text-parchmentlight text-sm outline-none mb-5 transition focus:border-gold"
        />

        {!courses && <div className="text-center text-slate-400 py-16 text-sm animate-pulse">یه لحظه…</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {courses &&
            filtered.map((course, idx) => (
              <CourseCard
                key={course.id}
                course={course}
                idx={idx}
                busy={busyCourseId === course.id}
                onVote={(profId) => castVote(course.id, profId)}
              />
            ))}
        </div>

        {courses && filtered.length === 0 && (
          <div className="text-center text-slate-400 py-16 text-sm">چیزی با این جست‌وجو پیدا نشد.</div>
        )}

        <footer className="mt-12 pt-6 border-t border-border/60 text-center animate-fadeIn">
          <p className="text-[11px] text-slate-500">
            طراحی و توسعه:{" "}
            <a
              href="https://github.com/nima-sedghi"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:underline"
            >
              نیما صدقی
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-panel border border-border rounded-md px-4 py-2 min-w-[100px] transition hover:border-gold/50">
      <div className="font-mono text-lg font-semibold text-gold">{value}</div>
      <div className="text-[11px] text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}

function CourseCard({
  course,
  idx,
  busy,
  onVote,
}: {
  course: Course;
  idx: number;
  busy: boolean;
  onVote: (profId: string) => void;
}) {
  const { revealed, myVote } = course;
  const total = course.total ?? 0;
  const maxCount = Math.max(0, ...course.professors.map((p) => p.count ?? 0));
  const leaders = course.professors.filter((p) => (p.count ?? 0) === maxCount && maxCount > 0);
  const isTie = leaders.length > 1;
  const leaderTag = LEADER_TAGS[idx % LEADER_TAGS.length];

  const ordered = revealed
    ? [...course.professors].sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    : course.professors;

  return (
    <div
      className="bg-parchment text-inkdark rounded-lg p-4 sm:p-5 border border-parchmentborder relative transition-all hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 animate-fadeInUp"
      style={{ animationDelay: `${idx * 60}ms` }}
    >
      <div className="flex justify-between mb-1.5">
        <div className="font-mono text-[11px] text-stamp tracking-wide">#{String(idx + 1).padStart(3, "0")}</div>
        {revealed && <div className="font-mono text-[11px] text-[#6B6350]">{total} رای</div>}
      </div>
      <h2 className="text-lg font-bold mb-3.5">{course.name}</h2>

      <div className="flex flex-col gap-2.5">
        {ordered.map((p) => {
          const cnt = p.count ?? 0;
          const pct = revealed && total > 0 ? Math.round((cnt / total) * 100) : 0;
          const isLeader = revealed && !isTie && leaders.length === 1 && leaders[0].id === p.id;
          const isMine = myVote === p.id;
          return (
            <button
              key={p.id}
              disabled={busy}
              onClick={() => onVote(p.id)}
              className={`relative w-full text-right bg-parchmentlight border-[1.5px] rounded-md px-3 py-2.5 transition-all active:scale-[0.98] ${
                isMine ? "border-gold" : "border-[#D8CEA8] hover:border-gold/60"
              } ${busy ? "opacity-50" : ""}`}
            >
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold flex items-center gap-1.5">
                  {isLeader && <span className="text-gold text-xs animate-softPulse">🔥</span>}
                  {p.name}
                  {isMine && (
                    <span className="text-[10px] bg-gold text-inkdark px-1.5 py-0.5 rounded-full font-semibold animate-popIn">
                      انتخاب تو
                    </span>
                  )}
                </span>
                {revealed && <span className="font-mono text-xs text-[#6B6350]">{pct}%</span>}
              </div>
              {revealed && (
                <div className="h-1.5 bg-[#E4D8B4] rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-ink rounded-full animate-fillIn transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              )}
              {isLeader && (
                <div className="absolute -top-3.5 -right-2.5 max-w-[70px] px-1.5 py-1 rounded-full border-2 border-dashed border-stamp text-stamp flex items-center justify-center text-[9px] font-bold text-center -rotate-6 bg-parchmentlight animate-popIn leading-tight">
                  {leaderTag}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {!revealed && (
        <div className="text-[11px] text-[#8B7A55] mt-2.5 text-center">درصدها بعد از رای دادنت (یا با دکمه‌ی «فقط نتیجه رو نشونم بده») میان</div>
      )}
      {revealed && isTie && (
        <div className="text-[11px] text-stamp mt-2.5 text-center">مساوی شدن {leaders.map((l) => l.name).join(" و ")}</div>
      )}
      {myVote && (
        <div className="text-[10px] text-[#8B7A55] mt-2 text-center">
          نظرت عوض شد؟ رو یه گزینه‌ی دیگه بزن، رایت خودکار عوض میشه.
        </div>
      )}
    </div>
  );
}
