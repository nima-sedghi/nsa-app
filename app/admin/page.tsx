"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { api } from "@/lib/api";

type Professor = { id: string; name: string; count?: number };
type Course = { id: string; name: string; professors: Professor[]; total?: number };

function normalizeHeader(cell: any): string {
  return String(cell ?? "").trim();
}
function cleanCell(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || s.toLowerCase() === "nan") return null;
  return s;
}
function parseInstitutionalAOA(aoa: any[][]) {
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(10, aoa.length); i++) {
    const row = aoa[i] || [];
    if (row.some((cell) => normalizeHeader(cell) === "نام درس")) {
      headerRowIdx = i;
      break;
    }
  }
  if (headerRowIdx === -1) return { groups: {} as Record<string, Set<string>>, ok: false };

  const header = (aoa[headerRowIdx] || []).map(normalizeHeader);
  const courseColIdx = header.indexOf("نام درس");
  let profColIdx = header.findIndex((h) => h === "استاد" || h === "نام استاد");
  if (profColIdx === -1) {
    profColIdx = header.findIndex((h) => h.includes("استاد") && !h.includes("ساير") && !h.includes("سایر") && !h.includes("دانشجو"));
  }
  const statusColIdx = header.findIndex((h) => h.includes("وضعيت") || h.includes("وضعیت"));

  const groups: Record<string, Set<string>> = {};
  for (let r = headerRowIdx + 1; r < aoa.length; r++) {
    const row = aoa[r] || [];
    if (statusColIdx !== -1) {
      const status = row[statusColIdx];
      if (typeof status === "string" && status.includes("حذف")) continue;
    }
    const course = cleanCell(row[courseColIdx]);
    let prof = profColIdx !== -1 ? cleanCell(row[profColIdx]) : null;
    if (!course || !prof) continue;
    prof = prof.replace(/^دكتر\s+/, "").replace(/^دکتر\s+/, "");
    if (!groups[course]) groups[course] = new Set();
    groups[course].add(prof);
  }
  return { groups, ok: true };
}

function downloadCSV(filename: string, rows: string[][]) {
  const content = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [loginErr, setLoginErr] = useState("");

  const [courses, setCourses] = useState<Course[] | null>(null);
  const [stats, setStats] = useState({ totalCourses: 0, totalVotes: 0, totalVoters: 0 });
  const [toast, setToast] = useState("");
  const [pendingConfirm, setPendingConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [query, setQuery] = useState("");

  const [newCourseName, setNewCourseName] = useState("");
  const [newProfNames, setNewProfNames] = useState("");
  const [csvText, setCsvText] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [importReport, setImportReport] = useState<{
    added: number;
    updated: number;
    skipped: { course: string; professors: string[] }[];
    possiblyStale: { course: string; professors: string[] }[];
  } | null>(null);

  const [addProfInputs, setAddProfInputs] = useState<Record<string, string>>({});
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameInputs, setRenameInputs] = useState<Record<string, string>>({});

  const showToast = (msg: string) => setToast(msg);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);
  const askConfirm = (message: string, onConfirm: () => void) => setPendingConfirm({ message, onConfirm });

  useEffect(() => {
    (async () => {
      try {
        const me = await api.adminMe();
        setAuthed(me.authed);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  const refreshAll = async () => {
    const res = await api.getAdminResults();
    setCourses(res.courses);
    setStats(res.stats);
  };

  useEffect(() => {
    if (authed) refreshAll().catch((e) => showToast(e.message));
  }, [authed]);

  const login = async () => {
    setLoginErr("");
    try {
      await api.adminLogin(passInput);
      setAuthed(true);
      setPassInput("");
    } catch (e: any) {
      setLoginErr(e.message || "رمز اشتباهه");
    }
  };

  const logout = async () => {
    await api.adminLogout();
    setAuthed(false);
  };

  const filtered = useMemo(() => {
    if (!courses) return [];
    const q = query.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) => c.name.toLowerCase().includes(q) || c.professors.some((p) => p.name.toLowerCase().includes(q)));
  }, [courses, query]);

  const addManualCourse = async () => {
    const name = newCourseName.trim();
    const profs = newProfNames.split(",").map((s) => s.trim()).filter(Boolean);
    if (!name || profs.length < 2) {
      showToast("نام درس و حداقل دو استاد لازمه");
      return;
    }
    try {
      await api.createCourse(name, profs);
      setNewCourseName("");
      setNewProfNames("");
      showToast("اضافه شد ✅");
      refreshAll();
    } catch (e: any) {
      showToast(e.message);
    }
  };

  const importCSVText = async () => {
    const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const groups = lines
      .map((line) => {
        const parts = line.split(",").map((p) => p.trim()).filter(Boolean);
        if (parts.length < 2) return null;
        const [name, ...professors] = parts;
        return { name, professors };
      })
      .filter(Boolean) as { name: string; professors: string[] }[];
    if (groups.length === 0) {
      showToast("متن خالیه یا فرمتش درست نیست");
      return;
    }
    try {
      const res = await api.importCourses(groups);
      setCsvText("");
      showToast(`${res.added} درس جدید، ${res.updated} به‌روزرسانی شد`);
      refreshAll();
    } catch (e: any) {
      showToast(e.message);
    }
  };

  const onCourseFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setImportBusy(true);
    setImportReport(null);
    const combined: Record<string, Set<string>> = {};
    let anyOk = false;
    let anyFailed = false;
    let leftoverText = "";

    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      try {
        if (ext === "xlsx" || ext === "xls") {
          const buf = await file.arrayBuffer();
          const wb = XLSX.read(buf, { type: "array" });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];
          const { groups, ok } = parseInstitutionalAOA(aoa);
          if (ok) {
            anyOk = true;
            Object.entries(groups).forEach(([course, profSet]) => {
              if (!combined[course]) combined[course] = new Set();
              profSet.forEach((p) => combined[course].add(p));
            });
          } else {
            anyFailed = true;
          }
        } else {
          leftoverText += (leftoverText ? "\n" : "") + (await file.text());
        }
      } catch {
        anyFailed = true;
      }
    }

    if (anyOk) {
      const groups = Object.entries(combined).map(([name, profSet]) => ({ name, professors: Array.from(profSet) }));
      try {
        const res = await api.importCourses(groups);
        setImportReport(res);
        showToast(`${res.added} درس جدید، ${res.updated} به‌روزرسانی شد`);
        refreshAll();
      } catch (err: any) {
        showToast(err.message);
      }
    } else if (anyFailed) {
      showToast("ستون «نام درس» رو تو فایل پیدا نکردم");
    }

    if (leftoverText) {
      setCsvText((prev) => (prev ? prev + "\n" + leftoverText : leftoverText));
      if (!anyOk) showToast("متن فایل تو کادر پایین ریخته شد، دکمه‌ی وارد کردن رو بزن");
    }

    setImportBusy(false);
    e.target.value = "";
  };

  const removeCourse = (id: string, name: string) => {
    askConfirm(`درس «${name}» و همه رای‌هاش حذف بشه؟`, async () => {
      try {
        await api.deleteCourse(id);
        showToast("حذف شد");
        refreshAll();
      } catch (e: any) {
        showToast(e.message);
      }
    });
  };

  const clearCourseVotes = (id: string, name: string) => {
    askConfirm(`همه آرای درس «${name}» پاک بشه؟`, async () => {
      try {
        await api.clearCourseVotes(id);
        showToast("آرا پاک شد");
        refreshAll();
      } catch (e: any) {
        showToast(e.message);
      }
    });
  };

  const resetAllVotes = () => {
    askConfirm(
      "همه‌ی آرای همه‌ی درس‌ها پاک بشه؟ خودِ درس‌ها و استادا دست‌نخورده می‌مونن، فقط رای‌ها صفر میشه — برای شروع یه ترم جدید.",
      async () => {
        try {
          await api.resetAllVotes();
          showToast("ترم جدید شروع شد، همه‌ی آرا صفر شدن");
          refreshAll();
        } catch (e: any) {
          showToast(e.message);
        }
      }
    );
  };

  const addProfessorTo = async (courseId: string) => {
    const name = (addProfInputs[courseId] || "").trim();
    if (!name) return;
    try {
      await api.addProfessor(courseId, name);
      setAddProfInputs((s) => ({ ...s, [courseId]: "" }));
      showToast("استاد اضافه شد");
      refreshAll();
    } catch (e: any) {
      showToast(e.message);
    }
  };

  const removeProfessorFrom = (courseId: string, profId: string, profName: string, profCount: number) => {
    if (profCount <= 2) {
      showToast("هر درس حداقل باید دو استاد داشته باشه");
      return;
    }
    askConfirm(`استاد «${profName}» از این درس حذف بشه؟ آرای این استاد هم پاک میشه.`, async () => {
      try {
        await api.removeProfessor(courseId, profId);
        showToast("حذف شد");
        refreshAll();
      } catch (e: any) {
        showToast(e.message);
      }
    });
  };

  const startRename = (id: string, name: string) => {
    setRenamingId(id);
    setRenameInputs((s) => ({ ...s, [id]: name }));
  };
  const confirmRename = async (id: string) => {
    const name = (renameInputs[id] || "").trim();
    if (!name) return;
    try {
      await api.renameCourse(id, name);
      setRenamingId(null);
      showToast("اسم عوض شد");
      refreshAll();
    } catch (e: any) {
      showToast(e.message);
    }
  };

  const exportResults = (course: Course) => {
    const rows = [["استاد", "تعداد رای", "درصد"]];
    const total = course.total || 0;
    course.professors.forEach((p) => {
      const c = p.count || 0;
      const pct = total > 0 ? Math.round((c / total) * 100) : 0;
      rows.push([p.name, String(c), pct + "%"]);
    });
    downloadCSV(course.name + "-نتایج.csv", rows);
  };

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-slate-300 text-sm font-mono animate-pulse">یه لحظه…</div>;
  }

  return (
    <div className="min-h-screen pb-16">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gold text-inkdark px-4 py-2 rounded font-semibold text-sm animate-popIn">
          {toast}
        </div>
      )}

      {pendingConfirm && (
        <div
          className="fixed inset-0 bg-inkdark/70 z-[100] flex items-center justify-center p-5 animate-fadeIn"
          onClick={() => setPendingConfirm(null)}
        >
          <div
            className="bg-parchment text-inkdark rounded-lg p-5 max-w-sm border border-parchmentborder animate-fadeInUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm leading-7 mb-4">{pendingConfirm.message}</div>
            <div className="flex gap-2.5">
              <button
                className="border border-stamp text-stamp px-3 py-1.5 rounded text-xs transition hover:bg-stamp hover:text-parchmentlight"
                onClick={() => {
                  const fn = pendingConfirm.onConfirm;
                  setPendingConfirm(null);
                  fn();
                }}
              >
                بله، انجام بده
              </button>
              <button className="border border-parchmentborder px-3 py-1.5 rounded text-xs" onClick={() => setPendingConfirm(null)}>
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="border-b border-border px-4 pt-8 pb-6 sm:px-6">
        <div className="max-w-3xl mx-auto flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] tracking-widest text-gold mb-2">پنل مدیریت</div>
            <h1 className="text-2xl font-extrabold">نظرسنجی انتخاب استاد</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/" className="border border-border text-parchmentlight px-4 py-2 rounded text-sm hover:bg-panel transition">
              نمای دانشجو
            </Link>
            {authed && (
              <button onClick={logout} className="border border-border text-parchmentlight px-4 py-2 rounded text-sm hover:bg-panel transition">
                خروج
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
        {!authed ? (
          <div className="bg-parchment text-inkdark rounded-lg p-6 max-w-sm border border-parchmentborder animate-fadeInUp">
            <div className="font-mono text-[11px] tracking-wide text-stamp mb-2.5">ورود ادمین</div>
            <input
              type="password"
              placeholder="رمز عبور"
              value={passInput}
              onChange={(e) => setPassInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
              className="w-full px-3 py-2.5 rounded border border-parchmentborder bg-parchmentlight text-sm outline-none"
            />
            {loginErr && <div className="text-stamp text-xs mt-2">{loginErr}</div>}
            <button onClick={login} className="mt-3 bg-ink text-parchmentlight px-4 py-2 rounded text-sm font-semibold transition hover:opacity-90 active:scale-95">
              ورود
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex gap-3 flex-wrap items-center animate-fadeInUp">
              <StatChip label="تعداد درس" value={stats.totalCourses} />
              <StatChip label="مجموع آرا" value={stats.totalVotes} />
              <StatChip label="دانشجویان شرکت‌کننده" value={stats.totalVoters} />
              <button
                onClick={resetAllVotes}
                className="text-xs px-4 py-2 rounded-full border border-stamp text-stamp transition hover:bg-stamp hover:text-parchmentlight active:scale-95"
              >
                شروع ترم جدید (صفر کردن همه‌ی آرا)
              </button>
            </div>

            <section className="bg-parchment text-inkdark rounded-lg p-5 border border-parchmentborder animate-fadeInUp">
              <h3 className="font-bold text-[15px] mb-3">افزودن دستی درس</h3>
              <input
                placeholder="نام درس (مثلا ریاضی عمومی)"
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
                className="w-full px-3 py-2.5 rounded border border-parchmentborder bg-parchmentlight text-sm outline-none"
              />
              <input
                placeholder="نام اساتید با ویرگول جدا کن، مثلا منصوری, محسنی, رضایی"
                value={newProfNames}
                onChange={(e) => setNewProfNames(e.target.value)}
                className="w-full mt-2.5 px-3 py-2.5 rounded border border-parchmentborder bg-parchmentlight text-sm outline-none"
              />
              <button onClick={addManualCourse} className="mt-3 bg-ink text-parchmentlight px-4 py-2 rounded text-sm font-semibold transition hover:opacity-90 active:scale-95">
                اضافه کردن درس
              </button>
            </section>

            <section className="bg-parchment text-inkdark rounded-lg p-5 border border-parchmentborder animate-fadeInUp">
              <h3 className="font-bold text-[15px] mb-3">وارد کردن دروس از فایل</h3>
              <p className="text-xs text-[#6B6350] mb-2.5 leading-6">
                فایل خام خروجی آموزشیار (.xlsx) رو همینجوری که هست بده — خودش ستون «نام درس» و «استاد» رو پیدا می‌کنه. چندتا فایل با هم هم اوکیه.
              </p>
              <input type="file" accept=".xlsx,.xls,.csv,.txt" multiple onChange={onCourseFilesUpload} disabled={importBusy} className="block text-xs mb-2" />
              {importBusy && <div className="text-xs text-[#6B6350] animate-pulse">در حال پردازش…</div>}
              {importReport && (
                <div className="bg-parchmentlight border border-[#D8CEA8] rounded p-3 mt-2 text-xs animate-fadeIn">
                  <div className="font-semibold mb-1.5">
                    {importReport.added} درس جدید، {importReport.updated} به‌روزرسانی شد
                  </div>
                  {importReport.skipped.length > 0 && (
                    <details className="mb-2">
                      <summary className="cursor-pointer">{importReport.skipped.length} درس رد شد (فقط یک استاد داشتن)</summary>
                      <ul className="mt-2 pr-4 text-[11px] text-[#6B6350] leading-7 list-disc">
                        {importReport.skipped.map((s, i) => (
                          <li key={i}>
                            {s.course} — {s.professors.join("، ")}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {importReport.possiblyStale.length > 0 && (
                    <details open>
                      <summary className="cursor-pointer text-stamp font-semibold">
                        ⚠️ {importReport.possiblyStale.length} درس — استادایی که تو فایل جدید نبودن
                      </summary>
                      <p className="text-[11px] text-[#6B6350] mt-2 mb-2 leading-6">
                        اینا از قبل تو سیستم بودن ولی تو فایلی که الان دادی، دیگه اسمشون نیومده. شاید دیگه این درس رو ارائه نمیدن — اگه درسته، از بخش «مدیریت درس‌های موجود» پایین‌تر دستی حذفشون کن. خودکار پاک نکردمشون چون ممکنه فایلت ناقص بوده باشه.
                      </p>
                      <ul className="pr-4 text-[11px] text-[#6B6350] leading-7 list-disc">
                        {importReport.possiblyStale.map((s, i) => (
                          <li key={i}>
                            <span className="font-semibold">{s.course}</span> — {s.professors.join("، ")}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
              <p className="text-xs text-[#6B6350] mt-3.5 mb-2">یا فرمت ساده‌ی خودت رو پیست کن، هر خط: نام درس, استاد۱, استاد۲</p>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded border border-parchmentborder bg-parchmentlight text-xs font-mono outline-none resize-y"
              />
              <button onClick={importCSVText} className="mt-2 bg-ink text-parchmentlight px-4 py-2 rounded text-sm font-semibold transition hover:opacity-90 active:scale-95">
                وارد کردن از متن بالا
              </button>
            </section>

            <section className="bg-parchment text-inkdark rounded-lg p-5 border border-parchmentborder animate-fadeInUp">
              <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                <h3 className="font-bold text-[15px]">مدیریت درس‌های موجود</h3>
                <input
                  placeholder="جست‌وجو…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="px-3 py-1.5 rounded-full border border-parchmentborder bg-parchmentlight text-xs outline-none"
                />
              </div>
              {filtered.map((c) => (
                <div key={c.id} className="flex justify-between items-start gap-3 py-3 border-b border-[#D8CEA8] flex-wrap">
                  {renamingId === c.id ? (
                    <div className="flex gap-2 flex-1">
                      <input
                        value={renameInputs[c.id] || ""}
                        onChange={(e) => setRenameInputs((s) => ({ ...s, [c.id]: e.target.value }))}
                        className="flex-1 px-3 py-2 rounded border border-parchmentborder bg-parchmentlight text-sm outline-none"
                      />
                      <button onClick={() => confirmRename(c.id)} className="border border-parchmentborder px-2.5 py-1.5 rounded text-xs">
                        ذخیره
                      </button>
                      <button onClick={() => setRenamingId(null)} className="border border-parchmentborder px-2.5 py-1.5 rounded text-xs">
                        انصراف
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-[200px]">
                      <div className="font-semibold flex items-center gap-2">
                        {c.name}
                        <button onClick={() => startRename(c.id, c.name)} className="text-stamp text-[11px] underline">
                          ویرایش نام
                        </button>
                        <span className="text-[11px] text-[#6B6350] font-mono">({c.total ?? 0} رای)</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {c.professors.map((p) => (
                          <span key={p.id} className="bg-parchmentlight border border-[#D8CEA8] rounded-full pl-2.5 pr-1.5 py-0.5 text-xs flex items-center gap-1.5">
                            {p.name} <span className="text-[10px] text-[#6B6350] font-mono">({p.count ?? 0})</span>
                            <button
                              onClick={() => removeProfessorFrom(c.id, p.id, p.name, c.professors.length)}
                              className="bg-[#E4D8B4] rounded-full w-4 h-4 text-[11px] text-stamp leading-none transition hover:bg-stamp hover:text-parchmentlight"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-1.5 mt-2 max-w-xs">
                        <input
                          placeholder="اضافه کردن استاد جدید"
                          value={addProfInputs[c.id] || ""}
                          onChange={(e) => setAddProfInputs((s) => ({ ...s, [c.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && addProfessorTo(c.id)}
                          className="flex-1 px-2.5 py-1.5 rounded border border-parchmentborder bg-parchmentlight text-xs outline-none"
                        />
                        <button onClick={() => addProfessorTo(c.id)} className="border border-parchmentborder px-2.5 py-1.5 rounded text-xs">
                          افزودن
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => exportResults(c)} className="border border-parchmentborder px-2.5 py-1.5 rounded text-xs whitespace-nowrap">
                      خروجی نتایج
                    </button>
                    <button onClick={() => clearCourseVotes(c.id, c.name)} className="border border-parchmentborder px-2.5 py-1.5 rounded text-xs whitespace-nowrap">
                      پاک کردن آرا
                    </button>
                    <button onClick={() => removeCourse(c.id, c.name)} className="border border-stamp text-stamp px-2.5 py-1.5 rounded text-xs whitespace-nowrap">
                      حذف درس
                    </button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <div className="text-xs text-[#6B6350] py-4">موردی پیدا نشد.</div>}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-panel border border-border rounded-md px-4 py-2 min-w-[110px] transition hover:border-gold/50">
      <div className="font-mono text-lg font-semibold text-gold">{value}</div>
      <div className="text-[11px] text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}
