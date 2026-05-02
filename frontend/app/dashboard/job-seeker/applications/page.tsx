"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { apiFetchAuthed } from "@/lib/api";

type AppRow = {
  id: number;
  job: number;
  job_title: string;
  company_label: string;
  status: string;
  cover_letter: string;
  resume_url: string | null;
  created_at: string;
};

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    pending: "Gözləmədə",
    reviewed: "Baxılıb",
    rejected: "Rədd",
    shortlisted: "Qısa siyahı",
  };
  return map[s] ?? s;
}

export default function MyApplicationsPage() {
  const [rows, setRows] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetchAuthed("/api/jobs/applications/mine/");
      if (res.status === 403) {
        setError("Bu səhifə yalnız namizəd rolü üçündür.");
        setRows([]);
        return;
      }
      if (res.status === 401) {
        setError("Daxil olun.");
        setRows([]);
        return;
      }
      if (!res.ok) {
        setError("Müraciətlər yüklənmədi.");
        return;
      }
      const data = (await res.json()) as AppRow[];
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setError("Şəbəkə xətası.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Müraciətlərim</h1>
          <p className="mt-1 text-sm text-slate-600">
            Göndərdiyiniz vakansiya müraciətləri və statusları.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/jobs" className="font-medium text-blue-600 hover:underline">
            Vakansiyalar
          </Link>
          <Link href="/dashboard/job-seeker" className="text-slate-500 hover:text-slate-800">
            ← Panel
          </Link>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-slate-500">Yüklənir…</p>
      ) : rows.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-slate-600">
          Hələ müraciət yoxdur.{" "}
          <Link href="/jobs" className="font-medium text-blue-600 hover:underline">
            Vakansiyalara baxın
          </Link>
          .
        </div>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.id} className="glass-panel rounded-xl p-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-blue-700">{r.company_label}</p>
                  <h2 className="text-lg font-semibold text-slate-900">{r.job_title}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {statusLabel(r.status)} ·{" "}
                    {new Date(r.created_at).toLocaleString("az-AZ")}
                  </p>
                </div>
                <Link
                  href={`/jobs/${r.job}`}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  Elana bax
                </Link>
              </div>
              {r.resume_url ? (
                <p className="mt-3 text-sm">
                  <a
                    href={r.resume_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-700 hover:underline"
                  >
                    CV faylını aç
                  </a>
                </p>
              ) : null}
              {r.cover_letter ? (
                <p className="mt-4 whitespace-pre-wrap text-sm text-slate-600">
                  {r.cover_letter}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
