"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { normalizeId, isDigitsOnly } from "@/lib/utils";

type Professor = { id: string; name: string; count: number | null };
type Course = { id: string; name: string; revealed: boolean; myVote: string | null; total: number | null; professors: Professor[] };

export default function VotePage() {
  const [studentId, setStudentId] = useState("");
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [cfg, setCfg] = useState({ mode: "open", minLen: 8, maxLen: 10 });
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [busyCourseId, setBusyCourseId] = useState<string | null>(null);

  const showToast = (msg: string) => setToast(msg);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const loadResults = async (id: string) => {
    const data = await api.getResults(id);
    setCourses(data.courses);
  };

  useEffect(() => {
    (async () => {
      const c = await api.getRosterConfig();
      setCfg(c);
      await loadResults("");
    })();
  }, []);

  // Re-poll every few seconds so results stay live without a manual refresh.
  useEffect(() => {
    const id = normalizeId(studentId);
    const interval = setInterval(() => {
      loadResults(id).catch(() => {});
    }, 6000);
    return () => clearInterval(interval);
  }, [studentId]);

  useEffect(() => {
    loadResults(normalizeId(studentId)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nid = normalizeId(studentId);
  const idStatus = useMemo(() => {
    if (!studentId.trim()) return null;
    if (!isDigitsOnly(nid)) return { ok: false, msg: "فقط عدد وارد کن" };
    if (nid.length < cfg.minLen || nid.length > cfg.maxLen) {
      return { ok: false, msg: `باید بین ${cfg.minLen} تا ${cfg.maxLen} رقم باشه` };
    }
    return { ok: true, msg: "فرمت درسته — اولین رایت خودکار ثبتت می‌کنه ✓" };
  }, [studentId, cfg]);

  const castVote = async (courseId: string, professorId: string) => {
    if (!nid) {
      showToast("اول شماره دانشجویی‌ت رو وارد کن");
      return;
    }
    if (idStatus && !idStatus.ok) {
      showToast(idStatus.msg);
      return;
    }
    setBusyCourseId(courseId);
    try {
      await api.vote(nid, courseId, professorId);
      await loadResults(nid);
      showToast("رای ثبت شد ✌️");
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

      <header className="border-b border-border px-4 pt-8 pb-6 sm:px-6">
        <div className="max-w-3xl mx-auto flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] tracking-widest text-gold mb-2">برگه رسمی نظرسنجی دانشکده</div>
            <h1 className="text-2xl sm:text-3xl font-extrabold mb-2">نظرسنجی انتخاب استاد</h1>
            <p className="text-sm text-slate-300 leading-7 max-w-md">
              برای هر درس، استادی که ترجیح می‌دی رو انتخاب کن. نتایج بعد از رای دادن نشونت داده میشه.
            </p>
          </div>
          <Link
            href="/admin"
            className="border border-border text-parchmentlight px-4 py-2 rounded text-sm hover:bg-panel transition"
          >
            پنل ادمین
          </Link>
        </div>

        {courses && (
          <div className="max-w-3xl mx-auto flex gap-3 flex-wrap mt-5">
            <StatChip label="تعداد درس" value={courses.length} />
            <StatChip
              label="مجموع آرا"
              value={courses.reduce((s, c) => s + (c.total ?? 0), 0)}
            />
          </div>
        )}
        <div
          className="max-w-3xl mx-auto mt-6 h-px"
          style={{ background: "repeating-linear-gradient(to left, #4A5A85 0 8px, transparent 8px 16px)" }}
        />
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
        <div className="bg-parchment text-inkdark rounded-md p-4 sm:p-5 mb-4 border border-parchmentborder">
          <div className="font-mono text-[11px] tracking-wide text-stamp mb-2">هویت رای‌دهنده</div>
          <input
            placeholder={`شماره دانشجویی (${cfg.minLen} تا ${cfg.maxLen} رقم)`}
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            inputMode="numeric"
            className="w-full px-3 py-2.5 rounded border border-parchmentborder bg-parchmentlight text-sm outline-none"
          />
          {idStatus && (
            <div className={`text-xs mt-2 ${idStatus.ok ? "text-good" : "text-stamp"}`}>{idStatus.msg}</div>
          )}
          <div className="text-xs text-[#6B6350] mt-2 leading-6">
            {cfg.mode === "closed"
              ? "فقط شماره‌هایی که ادمین از قبل تایید کرده می‌تونن رای بدن."
              : "شماره دانشجویی خودت رو وارد کن، خودکار ثبت میشه. تا رای ندی، درصدها مخفی می‌مونه."}
          </div>
        </div>

        <input
          placeholder="جست‌وجوی درس یا استاد…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-4 py-2.5 rounded-full border border-border bg-panel text-parchmentlight text-sm outline-none mb-5"
        />

        {!courses && <div className="text-center text-slate-400 py-16 text-sm">در حال بارگذاری…</div>}

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
          <div className="text-center text-slate-400 py-16 text-sm">هیچ درسی با این جست‌وجو پیدا نشد.</div>
        )}
      </main>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-panel border border-border rounded-md px-4 py-2 min-w-[110px]">
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
  const counts = course.professors.map((p) => p.count ?? 0);
  const total = course.total ?? 0;
  const maxCount = Math.max(0, ...counts);
  const leaders = course.professors.filter((p) => (p.count ?? 0) === maxCount && maxCount > 0);
  const isTie = leaders.length > 1;

  const ordered = revealed
    ? [...course.professors].sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    : course.professors;

  return (
    <div className="bg-parchment text-inkdark rounded-lg p-4 sm:p-5 border border-parchmentborder relative">
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
              disabled={revealed || busy}
              onClick={() => onVote(p.id)}
              className={`relative w-full text-right bg-parchmentlight border-[1.5px] rounded-md px-3 py-2.5 transition ${
                isMine ? "border-gold" : "border-[#D8CEA8]"
              } ${revealed ? "cursor-default" : "cursor-pointer hover:border-gold/60"} ${busy ? "opacity-50" : ""}`}
            >
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold flex items-center gap-1.5">
                  {isLeader && <span className="text-gold text-xs">★</span>}
                  {p.name}
                  {isMine && (
                    <span className="text-[10px] bg-gold text-inkdark px-1.5 py-0.5 rounded-full font-semibold">
                      رای تو
                    </span>
                  )}
                </span>
                {revealed && <span className="font-mono text-xs text-[#6B6350]">{pct}%</span>}
              </div>
              {revealed && (
                <div className="h-1.5 bg-[#E4D8B4] rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-ink rounded-full animate-fillIn" style={{ width: `${pct}%` }} />
                </div>
              )}
              {isLeader && (
                <div className="absolute -top-3.5 -right-2.5 w-14 h-14 rounded-full border-2 border-dashed border-stamp text-stamp flex items-center justify-center text-[10px] font-bold text-center -rotate-12 bg-parchmentlight animate-popIn leading-tight p-1">
                  پیشتاز
                </div>
              )}
            </button>
          );
        })}
      </div>

      {!revealed && <div className="text-[11px] text-[#8B7A55] mt-2.5 text-center">درصدها بعد از ثبت رایت نشون داده میشه</div>}
      {revealed && isTie && (
        <div className="text-[11px] text-stamp mt-2.5 text-center">برابری بین {leaders.map((l) => l.name).join(" و ")}</div>
      )}
    </div>
  );
}
