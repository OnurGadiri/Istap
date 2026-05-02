"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { EmployerProfileSettings } from "@/components/EmployerProfileSettings";
import { apiFetchAuthed } from "@/lib/api";
import {
  formatPremiumUntil,
  premiumExpiresAt,
  rolePremiumActive,
} from "@/lib/premium";
import { fetchSessionUser, type SessionUser } from "@/lib/session";

type Summary = {
  my_jobs_total: number;
  active_jobs: number;
  applications_total: number;
  pending_applications: number;
};

export default function CompanyDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<SessionUser | null | undefined>(undefined);

  const loadMe = useCallback(async () => {
    const u = await fetchSessionUser();
    setMe(u ?? null);
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  useEffect(() => {
    const onRefresh = () => void loadMe();
    window.addEventListener("istap-session", onRefresh);
    return () => window.removeEventListener("istap-session", onRefresh);
  }, [loadMe]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetchAuthed("/api/jobs/employer/summary/");
      if (!res.ok) {
        setSummary(null);
        setError("Statistika yüklənmədi.");
        return;
      }
      setSummary((await res.json()) as Summary);
    } catch {
      setSummary(null);
      setError("Şəbəkə xətası.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const premiumOn =
    me !== undefined && me !== null && rolePremiumActive(me);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Şirkət paneli</h1>
        <p className="mt-2 text-sm text-slate-600">
          Komandanız üçün elanlar və namizəd axını.
        </p>
      </div>

      {premiumOn ? (
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-emerald-50 px-5 py-4 shadow-sm">
          <p className="text-sm font-semibold text-emerald-900">Şirkət Premium aktivdir</p>
          <p className="mt-1 text-sm text-slate-700">
            Bitmə tarixi:{" "}
            <span className="font-medium text-slate-900">
              {formatPremiumUntil(premiumExpiresAt(me))}
            </span>
          </p>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="glass-panel rounded-2xl p-6">
            <p className="text-sm text-slate-500">Elanlar</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {summary.my_jobs_total}
            </p>
          </div>
          <div className="glass-panel rounded-2xl p-6">
            <p className="text-sm text-slate-500">Aktiv</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-700">
              {summary.active_jobs}
            </p>
          </div>
          <div className="glass-panel rounded-2xl p-6">
            <p className="text-sm text-slate-500">Müraciətlər</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {summary.applications_total}
            </p>
          </div>
          <div className="glass-panel rounded-2xl p-6">
            <p className="text-sm text-slate-500">Gözləmədə</p>
            <p className="mt-2 text-3xl font-semibold text-amber-700">
              {summary.pending_applications}
            </p>
          </div>
        </div>
      ) : null}

      <EmployerProfileSettings />

      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/jobs/manage" className="jb-btn-primary inline-flex">
          Vakansiya elanları
        </Link>
        <Link href="/dashboard/browse-seekers" className="jb-btn-secondary inline-flex">
          Namizəd profilləri
        </Link>
        <Link href="/dashboard/employer-insights" className="jb-btn-secondary inline-flex">
          Elan analitikası
        </Link>
        {me !== undefined && !premiumOn ? (
          <Link href="/premium" className="jb-btn-secondary inline-flex">
            Premium
          </Link>
        ) : null}
        <Link href="/jobs" className="jb-btn-secondary inline-flex">
          Bazardakı elanlar
        </Link>
      </div>
    </div>
  );
}
