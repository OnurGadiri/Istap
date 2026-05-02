"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  formatPremiumUntil,
  premiumExpiresAt,
  rolePremiumActive,
} from "@/lib/premium";
import { fetchSessionUser, type SessionUser } from "@/lib/session";

export default function JobSeekerDashboardPage() {
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

  const premiumOn =
    me !== undefined && me !== null && rolePremiumActive(me);

  return (
    <div className="space-y-6">
      {premiumOn ? (
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-emerald-50 px-5 py-4 shadow-sm">
          <p className="text-sm font-semibold text-emerald-900">Premium aktivdir</p>
          <p className="mt-1 text-sm text-slate-700">
            Bitmə tarixi:{" "}
            <span className="font-medium text-slate-900">
              {formatPremiumUntil(premiumExpiresAt(me))}
            </span>
          </p>
        </div>
      ) : null}

      <div className="glass-panel rounded-2xl p-10">
        <h1 className="text-2xl font-semibold text-slate-900">Namizəd paneli</h1>
        <p className="mt-4 text-slate-600">
          Profilinizi yeniləyin, vakansiyalara baxın və müraciətlərinizi izləyin.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/dashboard/job-seeker/profile" className="jb-btn-primary inline-flex">
            Profilimi redaktə et
          </Link>
          <Link href="/dashboard/job-seeker/applications" className="jb-btn-secondary inline-flex">
            Müraciətlərim
          </Link>
          <Link href="/dashboard/job-seeker/saved" className="jb-btn-secondary inline-flex">
            Seçilmişlər
          </Link>
          <Link href="/dashboard/job-seeker/cv-builder" className="jb-btn-secondary inline-flex">
            CV qurucu
          </Link>
          <Link href="/dashboard/job-seeker/insights" className="jb-btn-secondary inline-flex">
            Statistika
          </Link>
          {me !== undefined && !premiumOn ? (
            <Link href="/premium" className="jb-btn-secondary inline-flex">
              Premium
            </Link>
          ) : null}
          <Link href="/jobs" className="jb-btn-secondary inline-flex">
            Vakansiyalar
          </Link>
        </div>
      </div>
    </div>
  );
}
