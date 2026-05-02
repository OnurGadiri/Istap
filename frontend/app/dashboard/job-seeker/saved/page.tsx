"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { apiFetchAuthed } from "@/lib/api";

type JobRow = {
  id: number;
  company_label: string;
  title: string;
  description: string;
  location: string;
  work_mode: string;
  employment_type: string;
  salary_display: string;
  is_saved?: boolean;
};

function workModeLabel(m: string): string {
  const map: Record<string, string> = {
    remote: "Uzaqdan",
    hybrid: "Hibrid",
    onsite: "Ofisdə",
  };
  return map[m] ?? m;
}

export default function SavedJobsPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetchAuthed("/api/jobs/saved/");
      if (res.status === 403) {
        setError("Bu səhifə yalnız namizəd üçündür.");
        setJobs([]);
        return;
      }
      if (!res.ok) {
        setError("Siyahı yüklənmədi.");
        setJobs([]);
        return;
      }
      const data = (await res.json()) as JobRow[];
      setJobs(Array.isArray(data) ? data : []);
    } catch {
      setError("Şəbəkə xətası.");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function removeSaved(jobId: number) {
    const res = await apiFetchAuthed(`/api/jobs/${jobId}/bookmark/`, {
      method: "DELETE",
    });
    if (res.ok || res.status === 204) void load();
  }

  return (
    <div className="glass-panel rounded-2xl p-10">
      <h1 className="text-2xl font-semibold text-slate-900">Seçilmiş vakansiyalar</h1>
      <p className="mt-2 text-sm text-slate-600">
        Saxladığınız elanlar.{" "}
        <Link href="/jobs" className="font-medium text-blue-600 hover:underline">
          Bütün elanlar
        </Link>
      </p>
      {error ? (
        <p className="mt-6 text-sm text-red-600">{error}</p>
      ) : loading ? (
        <p className="mt-6 text-slate-500">Yüklənir…</p>
      ) : jobs.length === 0 ? (
        <p className="mt-6 text-slate-600">
          Hələ seçilmiş elan yoxdur. Vakansiya siyahısındakı ulduz işarəsindən əlavə edin.
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {jobs.map((j) => (
            <li
              key={j.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <Link
                  href={`/jobs/${j.id}`}
                  className="text-lg font-medium text-slate-900 hover:text-blue-700"
                >
                  {j.title}
                </Link>
                <p className="mt-1 text-sm text-slate-500">
                  {j.company_label}
                  {j.location ? ` · ${j.location}` : ""} · {workModeLabel(j.work_mode)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void removeSaved(j.id)}
                className="jb-btn-secondary shrink-0 px-4 py-2 text-sm"
              >
                Çıxar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
