"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { dashboardPathForRole } from "@/lib/auth-storage";
import { rolePremiumActive } from "@/lib/premium";
import { fetchSessionUser, type SessionUser } from "@/lib/session";

/** Vakansiyalar səhifəsi başlığında: daxil olmuşlara panel/premium, qonağa yalnız ana səhifə keçidi ilə uyğun sıra. */
export function JobsListingHeaderActions() {
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

  return (
    <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
      {me ? (
        <>
          <Link
            href={dashboardPathForRole(me.role)}
            className="text-sm font-medium text-blue-700 hover:underline"
          >
            Panel
          </Link>
          {!rolePremiumActive(me) &&
          ["job_seeker", "company", "recruiter"].includes(me.role) ? (
            <Link href="/premium" className="text-sm font-medium text-blue-700 hover:underline">
              Premium
            </Link>
          ) : null}
        </>
      ) : null}
      <Link href="/" className="text-sm font-medium text-blue-700 hover:underline">
        ← Ana səhifə
      </Link>
    </div>
  );
}
