"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { SiteHeader } from "@/components/SiteHeader";
import { apiFetch, apiFetchAuthed, apiFetchAuthedFormData } from "@/lib/api";
import { fetchSessionUser } from "@/lib/session";

type JobDetail = {
  id: number;
  company_label: string;
  employer_slug: string | null;
  title: string;
  description: string;
  location: string;
  work_mode: string;
  employment_type: string;
  salary_display: string;
  created_at: string;
  is_saved?: boolean;
};

type SimilarRow = {
  id: number;
  company_label: string;
  employer_slug: string | null;
  title: string;
  location: string;
  work_mode: string;
  employment_type: string;
  salary_display: string;
};

function workModeLabel(m: string): string {
  const map: Record<string, string> = {
    remote: "Uzaqdan",
    hybrid: "Hibrid",
    onsite: "Ofisdə",
  };
  return map[m] ?? m;
}

function employmentTypeLabel(t: string): string {
  const map: Record<string, string> = {
    full_time: "Tam ştat",
    part_time: "Yarım ştat",
    contract: "Müqavilə",
    internship: "Təcrübə",
  };
  return map[t] ?? t;
}

function companyInitial(name: string): string {
  const t = name.trim();
  return t ? t[0]!.toUpperCase() : "?";
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const idParam = params.id;
  const jobId = typeof idParam === "string" ? idParam : idParam?.[0] ?? "";

  const [job, setJob] = useState<JobDetail | null>(null);
  const [similar, setSimilar] = useState<SimilarRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [meRole, setMeRole] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applyOk, setApplyOk] = useState(false);
  const [applying, setApplying] = useState(false);
  const [copyOk, setCopyOk] = useState(false);

  const loadJob = useCallback(async () => {
    if (!jobId) return;
    setLoadError(null);
    try {
      const res = await apiFetchAuthed(`/api/jobs/${jobId}/`);
      if (res.status === 404) {
        setLoadError("Elan tapılmadı və ya aktiv deyil.");
        setJob(null);
        return;
      }
      if (!res.ok) {
        setLoadError("Yüklənmədi.");
        setJob(null);
        return;
      }
      setJob((await res.json()) as JobDetail);
    } catch {
      setLoadError("Şəbəkə xətası.");
      setJob(null);
    }
  }, [jobId]);

  const loadSimilar = useCallback(async () => {
    if (!jobId) return;
    try {
      const res = await apiFetch(`/api/jobs/${jobId}/similar/`);
      if (!res.ok) {
        setSimilar([]);
        return;
      }
      const data = (await res.json()) as SimilarRow[];
      setSimilar(Array.isArray(data) ? data : []);
    } catch {
      setSimilar([]);
    }
  }, [jobId]);

  const loadMe = useCallback(async () => {
    try {
      const u = await fetchSessionUser();
      setMeRole(u?.role ?? null);
    } catch {
      setMeRole(null);
    } finally {
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    void loadJob();
  }, [loadJob]);

  useEffect(() => {
    void loadSimilar();
  }, [loadSimilar]);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  async function toggleBookmark() {
    if (!job || meRole !== "job_seeker") return;
    const method = job.is_saved ? "DELETE" : "POST";
    const res = await apiFetchAuthed(`/api/jobs/${job.id}/bookmark/`, { method });
    if (res.ok || res.status === 204) void loadJob();
  }

  async function copyLink() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      await navigator.clipboard.writeText(url);
      setCopyOk(true);
      setTimeout(() => setCopyOk(false), 2000);
    } catch {
      setCopyOk(false);
    }
  }

  function formatApplyErrors(body: unknown): string {
    if (!body || typeof body !== "object") return "Müraciət göndərilmədi.";
    const o = body as Record<string, unknown>;
    if (typeof o.detail === "string") return o.detail;
    if (Array.isArray(o.detail)) return o.detail.map(String).join(" ");
    const parts: string[] = [];
    for (const v of Object.values(o)) {
      if (Array.isArray(v)) parts.push(...v.map(String));
      else if (typeof v === "string") parts.push(v);
    }
    return parts.length ? parts.join(" ") : "Müraciət göndərilmədi.";
  }

  async function onApply(e: FormEvent) {
    e.preventDefault();
    setApplyError(null);
    setApplyOk(false);
    setApplying(true);
    try {
      const fd = new FormData();
      fd.append("cover_letter", coverLetter);
      if (resumeFile) fd.append("resume", resumeFile);

      const res = await apiFetchAuthedFormData(`/api/jobs/${jobId}/apply/`, fd, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setApplyError("Müraciət üçün daxil olun.");
        return;
      }
      if (res.status === 403) {
        setApplyError("Yalnız namizəd rolu müraciət edə bilər.");
        return;
      }
      if (!res.ok) {
        setApplyError(formatApplyErrors(data));
        return;
      }
      setApplyOk(true);
      setCoverLetter("");
      setResumeFile(null);
    } catch {
      setApplyError("Şəbəkə xətası.");
    } finally {
      setApplying(false);
    }
  }

  const isSeeker = meRole === "job_seeker";
  const loggedIn = meRole !== null && meRole !== undefined;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-slate-50/50">
      <SiteHeader containerClassName="max-w-5xl" />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link href="/jobs" className="font-medium text-blue-700 hover:underline">
            ← Bütün vakansiyalar
          </Link>
          <Link href="/" className="text-slate-500 hover:text-slate-800">
            Ana səhifə
          </Link>
        </div>

        {loadError ? (
          <p className="text-sm font-medium text-red-600">{loadError}</p>
        ) : !job ? (
          <p className="text-slate-600">Yüklənir…</p>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <article className="glass-panel rounded-2xl p-6 sm:p-8">
                <div className="flex flex-wrap items-start gap-4">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xl font-bold text-blue-800"
                    aria-hidden
                  >
                    {companyInitial(job.company_label)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-600">
                      {job.employer_slug ? (
                        <Link
                          href={`/companies/${encodeURIComponent(job.employer_slug)}`}
                          className="text-blue-700 hover:underline"
                        >
                          {job.company_label}
                        </Link>
                      ) : (
                        job.company_label
                      )}
                    </p>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                      {job.title}
                    </h1>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {job.location ? <span className="jb-chip">{job.location}</span> : null}
                      <span className="jb-chip">{workModeLabel(job.work_mode)}</span>
                      <span className="jb-chip">
                        {employmentTypeLabel(job.employment_type || "full_time")}
                      </span>
                      {job.salary_display ? (
                        <span className="jb-chip border-emerald-200 bg-emerald-50 text-emerald-800">
                          {job.salary_display}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      Elan tarixi:{" "}
                      {job.created_at
                        ? new Date(job.created_at).toLocaleDateString("az-AZ", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "—"}
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-6">
                  <button type="button" onClick={copyLink} className="jb-btn-secondary !py-2 !text-sm">
                    {copyOk ? "Link kopyalandı" : "Linki kopyala"}
                  </button>
                  {isSeeker ? (
                    <button
                      type="button"
                      onClick={() => void toggleBookmark()}
                      className="jb-btn-secondary !border-amber-200 !bg-amber-50 !py-2 !text-sm !text-amber-900 hover:!bg-amber-100"
                    >
                      {job.is_saved ? "Seçilmişdən çıxar" : "Seçilmişlərə əlavə et"}
                    </button>
                  ) : null}
                </div>
                <div className="mt-8 max-w-none">
                  <h2 className="text-base font-bold text-slate-900">İşin təsviri</h2>
                  <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-800 sm:text-base">
                    {job.description}
                  </div>
                </div>
              </article>

              {similar.length > 0 ? (
                <section>
                  <h2 className="text-lg font-bold text-slate-900">Oxşar vakansiyalar</h2>
                  <ul className="mt-4 space-y-2">
                    {similar.map((s) => (
                      <li key={s.id}>
                        <Link
                          href={`/jobs/${s.id}`}
                          className="block rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-blue-200 hover:shadow"
                        >
                          <p className="font-semibold text-slate-900">{s.title}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {s.employer_slug ? (
                              <Link
                                href={`/companies/${encodeURIComponent(s.employer_slug)}`}
                                className="font-medium text-blue-700 hover:underline"
                              >
                                {s.company_label}
                              </Link>
                            ) : (
                              s.company_label
                            )}
                            {s.location ? ` · ${s.location}` : ""}
                            {" · "}
                            {employmentTypeLabel(s.employment_type)}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>

            <div className="lg:col-span-1">
              <div className="glass-panel sticky top-24 rounded-2xl p-6">
                <div className="mb-5 flex items-center gap-3 rounded-xl border border-slate-100 bg-white/90 p-3">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-lg font-bold text-blue-800"
                    aria-hidden
                  >
                    {companyInitial(job.company_label)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Şirkət
                    </p>
                    {job.employer_slug ? (
                      <Link
                        href={`/companies/${encodeURIComponent(job.employer_slug)}`}
                        className="text-sm font-semibold text-blue-700 hover:underline"
                      >
                        {job.company_label}
                      </Link>
                    ) : (
                      <p className="text-sm font-semibold text-slate-900">{job.company_label}</p>
                    )}
                  </div>
                </div>
                <h2 className="text-base font-bold text-slate-900">Müraciət</h2>
                {!authChecked ? (
                  <p className="mt-4 text-sm text-slate-500">Sessiya yoxlanılır…</p>
                ) : !loggedIn ? (
                  <p className="mt-4 text-sm text-slate-600">
                    Müraciət üçün{" "}
                    <Link href="/login" className="font-semibold text-blue-700 hover:underline">
                      daxil olun
                    </Link>{" "}
                    (namizəd hesabı).
                  </p>
                ) : !isSeeker ? (
                  <p className="mt-4 text-sm text-slate-600">
                    Müraciət yalnız <strong className="text-slate-800">namizəd</strong> rolü ilə
                    mümkündür.
                  </p>
                ) : (
                  <form onSubmit={onApply} className="mt-4 space-y-4">
                    <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                      CV (PDF, DOC, DOCX — maks. 5 MB, istəyə bağlı)
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="jb-input cursor-pointer py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-800"
                        onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
                      />
                      {resumeFile ? (
                        <span className="text-xs font-normal text-slate-500">
                          Seçildi: {resumeFile.name}
                        </span>
                      ) : null}
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                      Ön söz (istəyə bağlı)
                      <textarea
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        rows={5}
                        className="jb-input min-h-[120px] resize-y"
                      />
                    </label>
                    {applyError ? (
                      <p className="text-sm font-medium text-red-600" role="alert">
                        {applyError}
                      </p>
                    ) : null}
                    {applyOk ? (
                      <p className="text-sm font-medium text-emerald-700">
                        Müraciət qeydə alındı. Statusu “Müraciətlərim”dən izləyin.
                      </p>
                    ) : null}
                    <button
                      type="submit"
                      disabled={applying}
                      className="jb-btn-primary w-full justify-center"
                    >
                      {applying ? "Göndərilir…" : "Müraciət et"}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push("/dashboard/job-seeker/applications")}
                      className="jb-btn-secondary w-full justify-center"
                    >
                      Müraciətlərim
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
