"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { DashboardGate } from "@/components/DashboardGate";
import { apiFetchAuthed } from "@/lib/api";

type BrowseRow = {
  public_slug: string;
  first_name: string;
  last_name: string;
  bio: string;
  location: string;
  work_mode: string;
  skills: string;
  updated_at: string;
  is_premium: boolean;
};

type PagePayload = {
  results?: BrowseRow[];
  next?: string | null;
};

function BrowseSeekersContent() {
  const [rows, setRows] = useState<BrowseRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetchAuthed("/api/job-seeker/browse/");
      if (res.status === 403) {
        setError("Bu səhifəyə icazə yoxdur.");
        setRows([]);
        return;
      }
      if (!res.ok) {
        setError("Siyahı yüklənmədi.");
        setRows([]);
        return;
      }
      const data = (await res.json()) as PagePayload | BrowseRow[];
      setRows(Array.isArray(data) ? data : (data.results ?? []));
    } catch {
      setError("Şəbəkə xətası.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">İctimai namizəd profilləri</h1>
        <p className="mt-2 text-sm text-slate-600">
          Premium namizədlər üst sıradadır. İctimai slug təyin edilmiş profillər görünür.
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-slate-500">Yüklənir…</p>
      ) : rows.length === 0 ? (
        <p className="text-slate-600">Hələ uyğun ictimai profil yoxdur.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.public_slug}>
              <Link
                href={`/u/${r.public_slug}`}
                className="block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {(r.first_name || "").trim()} {(r.last_name || "").trim()}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{r.location}</p>
                  </div>
                  {r.is_premium ? (
                    <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-medium text-amber-900">
                      Premium namizəd
                    </span>
                  ) : null}
                </div>
                {r.skills ? (
                  <p className="mt-3 line-clamp-2 text-sm text-slate-700">{r.skills}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function BrowseSeekersPage() {
  return (
    <DashboardGate allowedRoles={["company", "recruiter", "admin"]}>
      <BrowseSeekersContent />
    </DashboardGate>
  );
}
