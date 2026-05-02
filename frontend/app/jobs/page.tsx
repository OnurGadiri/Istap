"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  FormEvent,
  MouseEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { JobsListingHeaderActions } from "@/components/JobsListingHeaderActions";
import { SiteHeader } from "@/components/SiteHeader";
import { apiFetchAuthed } from "@/lib/api";
import { fetchSessionUser } from "@/lib/session";

const PAGE_SIZE = 10;

type JobRow = {
  id: number;
  company_label: string;
  title: string;
  description: string;
  location: string;
  work_mode: string;
  employment_type: string;
  salary_display: string;
  created_at: string;
  is_saved?: boolean;
  employer_premium?: boolean;
};

type JobsListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: JobRow[];
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

function JobsListSkeleton() {
  return (
    <ul className="space-y-3" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="glass-panel animate-pulse rounded-xl p-5">
          <div className="flex gap-4">
            <div className="h-12 w-12 shrink-0 rounded-lg bg-slate-200" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-40 rounded bg-slate-200" />
              <div className="h-5 max-w-md rounded bg-slate-200" />
              <div className="h-3 w-full rounded bg-slate-100" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function JobsListContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [meRole, setMeRole] = useState<string | null>(null);

  const [workMode, setWorkMode] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [ordering, setOrdering] = useState("-created_at");
  const [location, setLocation] = useState("");
  const [q, setQ] = useState("");

  const page = useMemo(() => {
    const p = parseInt(searchParams.get("page") || "1", 10);
    return Number.isFinite(p) && p >= 1 ? p : 1;
  }, [searchParams]);

  useEffect(() => {
    void fetchSessionUser().then((u) => setMeRole(u?.role ?? null));
  }, []);

  useEffect(() => {
    setWorkMode(searchParams.get("work_mode") ?? "");
    setEmploymentType(searchParams.get("employment_type") ?? "");
    setOrdering(searchParams.get("ordering") ?? "-created_at");
    setLocation(searchParams.get("location") ?? "");
    setQ(searchParams.get("q") ?? "");
  }, [searchParams]);

  const fetchJobs = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (workMode) params.set("work_mode", workMode);
      if (employmentType) params.set("employment_type", employmentType);
      if (ordering && ordering !== "-created_at") params.set("ordering", ordering);
      if (location.trim()) params.set("location", location.trim());
      if (q.trim()) params.set("q", q.trim());
      if (page > 1) params.set("page", String(page));
      const qs = params.toString();
      const url = qs ? `/api/jobs/?${qs}` : "/api/jobs/";
      const res = await apiFetchAuthed(url);
      if (res.status === 404 && page > 1) {
        const reset = new URLSearchParams();
        if (workMode) reset.set("work_mode", workMode);
        if (employmentType) reset.set("employment_type", employmentType);
        if (ordering && ordering !== "-created_at") reset.set("ordering", ordering);
        if (location.trim()) reset.set("location", location.trim());
        if (q.trim()) reset.set("q", q.trim());
        const rqs = reset.toString();
        router.replace(rqs ? `${pathname}?${rqs}` : pathname);
        return;
      }
      if (!res.ok) {
        setError("Elanlar yüklənmədi.");
        setJobs([]);
        setTotalCount(0);
        return;
      }
      const data = (await res.json()) as JobsListResponse | JobRow[];
      if (Array.isArray(data)) {
        setJobs(data);
        setTotalCount(data.length);
      } else if (data && Array.isArray(data.results)) {
        setJobs(data.results);
        setTotalCount(typeof data.count === "number" ? data.count : 0);
      } else {
        setJobs([]);
        setTotalCount(0);
      }
    } catch {
      setError("Şəbəkə xətası.");
      setJobs([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [workMode, employmentType, ordering, location, q, page, pathname, router]);

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  function buildListUrl(targetPage: number) {
    const params = new URLSearchParams();
    if (workMode) params.set("work_mode", workMode);
    if (employmentType) params.set("employment_type", employmentType);
    if (ordering && ordering !== "-created_at") params.set("ordering", ordering);
    if (location.trim()) params.set("location", location.trim());
    if (q.trim()) params.set("q", q.trim());
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function onFilterSubmit(e: FormEvent) {
    e.preventDefault();
    router.push(buildListUrl(1));
  }

  function clearFilters() {
    setWorkMode("");
    setEmploymentType("");
    setOrdering("-created_at");
    setLocation("");
    setQ("");
    router.push(pathname);
  }

  async function toggleBookmark(e: MouseEvent, jobId: number, isSaved: boolean) {
    e.preventDefault();
    e.stopPropagation();
    const method = isSaved ? "DELETE" : "POST";
    const res = await apiFetchAuthed(`/api/jobs/${jobId}/bookmark/`, { method });
    if (res.ok || res.status === 204) void fetchJobs();
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const showBookmark = meRole === "job_seeker";
  const selectClass = "jb-input py-2.5";

  return (
    <>
      <form
        onSubmit={onFilterSubmit}
        className="glass-panel mb-8 grid gap-4 rounded-2xl p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 xl:col-span-2">
          Axtarış
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Başlıq və ya təsvir"
            className="jb-input"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Yer
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Məs. Bakı"
            className="jb-input"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          İş rejimi
          <select value={workMode} onChange={(e) => setWorkMode(e.target.value)} className={selectClass}>
            <option value="">Hamısı</option>
            <option value="remote">Uzaqdan</option>
            <option value="hybrid">Hibrid</option>
            <option value="onsite">Ofisdə</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Məşğulluq
          <select
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value)}
            className={selectClass}
          >
            <option value="">Hamısı</option>
            <option value="full_time">Tam ştat</option>
            <option value="part_time">Yarım ştat</option>
            <option value="contract">Müqavilə</option>
            <option value="internship">Təcrübə</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Sıralama
          <select value={ordering} onChange={(e) => setOrdering(e.target.value)} className={selectClass}>
            <option value="-created_at">Ən yeni</option>
            <option value="created_at">Ən köhnə</option>
            <option value="title">Başlıq (A-Z)</option>
            <option value="-title">Başlıq (Z-A)</option>
          </select>
        </label>
        <div className="flex flex-wrap items-end gap-2 xl:col-span-6">
          <button type="submit" className="jb-btn-primary">
            Filtrlə
          </button>
          <button type="button" onClick={clearFilters} className="jb-btn-secondary">
            Sıfırla
          </button>
        </div>
      </form>

      {error ? (
        <p className="text-sm font-medium text-red-600">{error}</p>
      ) : loading ? (
        <JobsListSkeleton />
      ) : jobs.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center text-slate-600">
          Bu meyarlara uyğun aktiv elan yoxdur. Filtrləri dəyişin və ya şirkət hesabı ilə
          yeni elan əlavə edin.
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{totalCount}</span> elan
            {totalPages > 1 ? (
              <>
                {" "}
                · səhifə{" "}
                <span className="font-semibold text-slate-900">
                  {page} / {totalPages}
                </span>
              </>
            ) : null}
          </p>
          <ul className="space-y-3">
            {jobs.map((j) => (
              <li key={j.id}>
                <Link
                  href={`/jobs/${j.id}`}
                  className="group relative flex gap-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                >
                  {showBookmark ? (
                    <button
                      type="button"
                      title={j.is_saved ? "Seçilmişlərdən çıxar" : "Seçilmişlərə əlavə et"}
                      onClick={(e) => toggleBookmark(e, j.id, Boolean(j.is_saved))}
                      className="absolute right-3 top-3 z-10 rounded-lg border border-slate-200 bg-white px-2 py-1 text-base leading-none text-amber-500 shadow-sm hover:bg-amber-50"
                    >
                      {j.is_saved ? "★" : "☆"}
                    </button>
                  ) : null}
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-lg font-bold text-blue-800"
                    aria-hidden
                  >
                    {companyInitial(j.company_label)}
                  </div>
                  <div className="min-w-0 flex-1 pr-10">
                    <p className="text-sm font-medium text-slate-600">{j.company_label}</p>
                    <h2 className="mt-0.5 text-lg font-semibold text-slate-900 group-hover:text-blue-700">
                      {j.title}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {j.employer_premium ? (
                        <span className="jb-chip border-amber-200 bg-amber-50 text-amber-900">
                          Premium şirkət
                        </span>
                      ) : null}
                      {j.location ? <span className="jb-chip">{j.location}</span> : null}
                      <span className="jb-chip">{workModeLabel(j.work_mode)}</span>
                      <span className="jb-chip">
                        {employmentTypeLabel(j.employment_type || "full_time")}
                      </span>
                      {j.salary_display ? (
                        <span className="jb-chip border-emerald-200 bg-emerald-50 text-emerald-800">
                          {j.salary_display}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">
                      {j.description}
                    </p>
                    <p className="mt-2 text-sm font-medium text-blue-700">
                      Ətraflı bax →
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {totalPages > 1 ? (
            <nav
              className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6"
              aria-label="Səhifələmə"
            >
              <button
                type="button"
                disabled={!canPrev}
                onClick={() => router.push(buildListUrl(page - 1))}
                className="jb-btn-secondary disabled:cursor-not-allowed"
              >
                ← Əvvəlki
              </button>
              <button
                type="button"
                disabled={!canNext}
                onClick={() => router.push(buildListUrl(page + 1))}
                className="jb-btn-secondary disabled:cursor-not-allowed"
              >
                Növbəti →
              </button>
            </nav>
          ) : null}
        </>
      )}
    </>
  );
}

export default function PublicJobsPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-slate-50/50">
      <SiteHeader containerClassName="max-w-5xl" />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Vakansiya axtarışı
            </h1>
            <p className="mt-2 text-slate-600">
              Filtr, sıralama və seçilmişlər — bir yerdə.
            </p>
          </div>
          <JobsListingHeaderActions />
        </div>

        <Suspense fallback={<JobsListSkeleton />}>
          <JobsListContent />
        </Suspense>
      </div>
    </div>
  );
}
