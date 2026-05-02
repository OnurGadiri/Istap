"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { clearTokens, dashboardPathForRole } from "@/lib/auth-storage";
import { fetchSessionUser, type SessionUser } from "@/lib/session";

type SiteHeaderProps = {
  containerClassName?: string;
};

export function SiteHeader({
  containerClassName = "max-w-6xl",
}: SiteHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);

  const loadUser = useCallback(() => {
    void fetchSessionUser().then(setUser);
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser, pathname]);

  useEffect(() => {
    const onRefresh = () => loadUser();
    window.addEventListener("istap-session", onRefresh);
    return () => window.removeEventListener("istap-session", onRefresh);
  }, [loadUser]);

  function logout() {
    clearTokens();
    setUser(null);
    router.push("/");
    router.refresh();
  }

  const link =
    "text-sm font-medium text-slate-600 transition hover:text-blue-700";

  const premiumActive =
    user &&
    ((user.role === "job_seeker" && user.is_premium_seeker) ||
      ((user.role === "company" || user.role === "recruiter") &&
        user.is_premium_employer));

  return (
    <header className="jb-header">
      <div
        className={`mx-auto flex flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 ${containerClassName}`}
      >
        <Link
          href="/"
          className="flex items-center gap-2 outline-none ring-blue-600/40 focus-visible:ring-2"
        >
          <Image
            src="/loqo.jpeg"
            alt="Istap"
            width={160}
            height={48}
            priority
            className="h-9 w-auto max-h-9 object-contain object-left sm:h-10"
          />
        </Link>
        <nav
          className="flex flex-wrap items-center justify-end gap-x-1 gap-y-2 sm:gap-x-2"
          aria-label="Əsas naviqasiya"
        >
          <Link href="/jobs" className={`${link} px-2`}>
            Vakansiyalar
          </Link>
          {user?.role === "job_seeker" ? (
            <Link href="/dashboard/job-seeker/saved" className={`${link} px-2`}>
              Seçilmişlər
            </Link>
          ) : null}
          {user ? (
            <>
              {premiumActive ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                  Premium
                </span>
              ) : null}
              <Link
                href={dashboardPathForRole(user.role)}
                className={`${link} px-2 font-semibold text-blue-700`}
              >
                Panel
              </Link>
              <span
                className="hidden max-w-[11rem] truncate px-2 text-xs text-slate-500 sm:inline"
                title={user.email}
              >
                {user.email}
              </span>
              <button
                type="button"
                onClick={logout}
                className="jb-btn-secondary !py-1.5 !text-xs"
              >
                Çıxış
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={`${link} px-2`}>
                Giriş
              </Link>
              <Link href="/register" className="jb-btn-primary !py-2 !text-sm">
                Qeydiyyat
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
