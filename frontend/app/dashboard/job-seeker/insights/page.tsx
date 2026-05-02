"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { DashboardGate } from "@/components/DashboardGate";
import { apiFetchAuthed } from "@/lib/api";

type InsightsPayload = {
  applications_by_status?: Record<string, number>;
  applications_total?: number;
  profile_views_recent?: { at: string; viewer_email: string | null }[];
  detail?: string;
};

function InsightsContent() {
  const [data, setData] = useState<InsightsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetchAuthed("/api/job-seeker/insights/");
      const body = (await res.json()) as InsightsPayload;
      if (!res.ok) {
        setData(null);
        setError(body.detail || "Məlumat alınmadı.");
        return;
      }
      setData(body);
    } catch {
      setData(null);
      setError("Şəbəkə xətası.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-slate-500">
          <Link href="/dashboard/job-seeker" className="text-blue-700 hover:underline">
            ← Namizəd paneli
          </Link>
        </p>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">Statistika (Premium)</h1>
        <p className="mt-2 text-sm text-slate-600">
          Müraciətlər və profilə baxışlar — Premium namizəd üçün.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}{" "}
          <Link href="/premium" className="font-medium underline">
            Premium
          </Link>
        </div>
      ) : null}

      {data ? (
        <>
          <div className="glass-panel rounded-2xl p-6">
            <p className="text-sm text-slate-500">Ümumi müraciət</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {data.applications_total ?? 0}
            </p>
          </div>
          {data.applications_by_status &&
          Object.keys(data.applications_by_status).length > 0 ? (
            <div className="glass-panel rounded-2xl p-6">
              <h2 className="font-semibold text-slate-900">Status üzrə</h2>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                {Object.entries(data.applications_by_status).map(([k, v]) => (
                  <li key={k}>
                    <span className="font-medium">{k}</span>: {v}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="font-semibold text-slate-900">Son profil baxışları</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {(data.profile_views_recent ?? []).length === 0 ? (
                <li>Hələ qeyd yoxdur.</li>
              ) : (
                data.profile_views_recent!.map((v, i) => (
                  <li key={`${v.at}-${i}`}>
                    {v.at}
                    {v.viewer_email ? ` — ${v.viewer_email}` : " — anonim"}
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function JobSeekerInsightsPage() {
  return (
    <DashboardGate allowedRoles={["job_seeker"]}>
      <InsightsContent />
    </DashboardGate>
  );
}
