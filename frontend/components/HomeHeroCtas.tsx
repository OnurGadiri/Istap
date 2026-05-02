"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { dashboardPathForRole } from "@/lib/auth-storage";
import { rolePremiumActive } from "@/lib/premium";
import { fetchSessionUser, type SessionUser } from "@/lib/session";

export function HomeHeroCtas() {
  const [me, setMe] = useState<SessionUser | null | undefined>(undefined);

  const load = useCallback(async () => {
    setMe((await fetchSessionUser()) ?? null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onRefresh = () => void load();
    window.addEventListener("istap-session", onRefresh);
    return () => window.removeEventListener("istap-session", onRefresh);
  }, [load]);

  if (me === undefined) {
    return <div className="min-h-[5.5rem]" aria-hidden />;
  }

  if (me) {
    const panelHref = dashboardPathForRole(me.role);
    const premiumOn = rolePremiumActive(me);
    const showPremiumBtn =
      !premiumOn &&
      ["job_seeker", "company", "recruiter"].includes(me.role);

    return (
      <div>
        <div className="flex flex-wrap gap-3">
          <Link href="/jobs" className="jb-btn-primary">
            Vakansiyalar
          </Link>
          <Link href={panelHref} className="jb-btn-secondary">
            Panelə keç
          </Link>
          {showPremiumBtn ? (
            <Link href="/premium" className="jb-btn-secondary">
              Premium
            </Link>
          ) : null}
        </div>
        {premiumOn ? (
          <p className="mt-6 text-sm text-slate-600">
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
              Premium aktiv
            </span>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <Link href="/jobs" className="jb-btn-primary">
          Bütün elanlar
        </Link>
        <Link href="/register" className="jb-btn-secondary">
          Pulsuz hesab
        </Link>
      </div>
      <p className="mt-6 text-sm text-slate-600">
        Artıq hesabınız var?{" "}
        <Link href="/login" className="font-semibold text-blue-700 hover:underline">
          Daxil olun
        </Link>
      </p>
    </div>
  );
}
