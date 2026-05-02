"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { clearTokens } from "@/lib/auth-storage";
import { rolePremiumActive } from "@/lib/premium";
import { fetchSessionUser, type SessionUser } from "@/lib/session";

const EMPLOYER_ROLES = new Set(["company", "recruiter", "admin"]);

function panelLinkForRole(
  role: string,
): { href: string; label: string } | null {
  switch (role) {
    case "job_seeker":
      return { href: "/dashboard/job-seeker", label: "Namizəd paneli" };
    case "recruiter":
      return { href: "/dashboard/recruiter", label: "Recruiter paneli" };
    case "company":
      return { href: "/dashboard/company", label: "Şirkət paneli" };
    case "admin":
      return { href: "/dashboard/admin", label: "Admin paneli" };
    default:
      return null;
  }
}

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<SessionUser | null>(null);

  const loadMe = useCallback(async () => {
    const u = await fetchSessionUser();
    setMe(u);
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  useEffect(() => {
    const onRefresh = () => void loadMe();
    window.addEventListener("istap-session", onRefresh);
    return () => window.removeEventListener("istap-session", onRefresh);
  }, [loadMe]);

  function logout() {
    clearTokens();
    setMe(null);
    router.push("/");
    router.refresh();
  }

  const myPanel = me ? panelLinkForRole(me.role) : null;

  const premiumActive = me ? rolePremiumActive(me) : false;

  const navLinks = [
    { href: "/jobs", label: "Vakansiyalar" },
    ...(me?.role === "job_seeker"
      ? [{ href: "/dashboard/job-seeker/saved", label: "Seçilmişlər" } as const]
      : []),
    ...(me && EMPLOYER_ROLES.has(me.role)
      ? [
          { href: "/dashboard/jobs/manage", label: "Elanlarım" } as const,
          { href: "/dashboard/browse-seekers", label: "Namizədlər" } as const,
        ]
      : []),
    ...(me &&
    ["job_seeker", "company", "recruiter"].includes(me.role) &&
    !premiumActive
      ? [{ href: "/premium", label: "Premium" } as const]
      : []),
    ...(myPanel ? [myPanel] : []),
  ];

  return (
    <header className="jb-header border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/loqo.jpeg"
              alt="Istap"
              width={140}
              height={42}
              className="h-8 w-auto max-h-8 object-contain sm:h-9"
            />
          </Link>
          <nav className="flex flex-wrap gap-1 text-sm">
            {navLinks.map((l) => {
              const active =
                pathname === l.href || pathname.startsWith(`${l.href}/`);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-lg px-3 py-1.5 font-medium transition ${
                    active
                      ? "bg-blue-50 text-blue-800"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {me ? (
            <>
              {premiumActive ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                  Premium
                </span>
              ) : null}
              <span className="max-w-[200px] truncate text-slate-500" title={me.email}>
                {me.email}
              </span>
            </>
          ) : (
            <Link href="/login" className="font-medium text-blue-600 hover:underline">
              Giriş
            </Link>
          )}

          {me ? (
            <button
              type="button"
              onClick={logout}
              className="jb-btn-secondary !py-1.5 !text-xs"
            >
              Çıxış
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
