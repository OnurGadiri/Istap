"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { DashboardGate } from "@/components/DashboardGate";
import { apiFetchAuthed } from "@/lib/api";

type Row = {
  job_id: number;
  title: string;
  is_active: boolean;
  views_total: number;
  views_last_7_days: number;
  applications: number;
};

type Payload = { jobs?: Row[]; detail?: string };

function EmployerInsightsInner() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetchAuthed("/api/jobs/employer/insights/");
      const body = (await res.json()) as Payload;
      if (!res.ok) {
        setRows([]);
        setError(body.detail || "Məlumat alınmadı.");
        return;
      }
      setRows(body.jobs ?? []);
    } catch {
      setRows([]);
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
          <Link href="/dashboard/jobs/manage" className="text-blue-700 hover:underline">
            ← Elanlar
          </Link>
        </p>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">
          Elan analitikası (Premium)
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Baxış sayları və müraciətlər — yalnız şirkət Premium üçün.
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

      {rows.length === 0 && !error ? (
        <p className="text-slate-600">Hələ elan yoxdur.</p>
      ) : rows.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700">Elan</th>
                <th className="px-4 py-3 font-medium text-slate-700">Aktiv</th>
                <th className="px-4 py-3 font-medium text-slate-700">Baxış (7 gün)</th>
                <th className="px-4 py-3 font-medium text-slate-700">Baxış (ümumi)</th>
                <th className="px-4 py-3 font-medium text-slate-700">Müraciət</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.job_id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.title}</td>
                  <td className="px-4 py-3">{r.is_active ? "Bəli" : "Xeyr"}</td>
                  <td className="px-4 py-3">{r.views_last_7_days}</td>
                  <td className="px-4 py-3">{r.views_total}</td>
                  <td className="px-4 py-3">{r.applications}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

export default function EmployerInsightsPage() {
  return (
    <DashboardGate allowedRoles={["company", "recruiter", "admin"]}>
      <EmployerInsightsInner />
    </DashboardGate>
  );
}
