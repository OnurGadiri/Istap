"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { SiteHeader } from "@/components/SiteHeader";
import { apiFetch } from "@/lib/api";

type JobCard = {
  id: number;
  company_label: string;
  employer_slug: string | null;
  title: string;
  description: string;
  location: string;
  work_mode: string;
  employment_type: string;
  salary_display: string;
  created_at: string;
};

type CompanyPublic = {
  slug: string;
  display_name: string;
  tagline: string;
  about: string;
  website: string;
  logo_url: string | null;
  jobs: JobCard[];
};

function workModeLabel(m: string): string {
  const map: Record<string, string> = {
    remote: "Uzaqdan",
    hybrid: "Hibrid",
    onsite: "Ofisdə",
  };
  return map[m] ?? m;
}

function employmentTypeLabel(t: string): string {
  const map: Record<string, string> = {
    full_time: "Tam ştat",
    part_time: "Yarım ştat",
    contract: "Müqavilə",
    internship: "Təcrübə",
  };
  return map[t] ?? t;
}

function companyInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]!.slice(0, 1) + parts[1]!.slice(0, 1)).toUpperCase();
  }
  const w = parts[0] ?? "?";
  if (w.length >= 2) return w.slice(0, 2).toUpperCase();
  return w.slice(0, 1).toUpperCase();
}

export default function CompanyPublicPage() {
  const params = useParams();
  const slugParam = params.slug;
  const slug = typeof slugParam === "string" ? slugParam : slugParam?.[0] ?? "";

  const [data, setData] = useState<CompanyPublic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!slug) return;
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch(`/api/companies/${encodeURIComponent(slug)}/`);
      if (res.status === 404) {
        setError("Bu ünvanla şirkət səhifəsi tapılmadı.");
        setData(null);
        return;
      }
      if (!res.ok) {
        setError("Məlumat yüklənmədi.");
        setData(null);
        return;
      }
      setData((await res.json()) as CompanyPublic);
    } catch {
      setError("Şəbəkə xətası.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-slate-50/50">
      <SiteHeader containerClassName="max-w-5xl" />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 text-sm">
          <Link href="/jobs" className="font-medium text-blue-700 hover:underline">
            ← Vakansiyalar
          </Link>
        </div>

        {loading ? (
          <p className="text-slate-600">Yüklənir…</p>
        ) : error ? (
          <p className="text-sm font-medium text-red-600">{error}</p>
        ) : data ? (
          <div className="space-y-8">
            <header className="glass-panel rounded-2xl p-6 sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <div className="flex shrink-0 justify-center sm:justify-start">
                  {data.logo_url ? (
                    <Image
                      src={data.logo_url}
                      alt=""
                      width={128}
                      height={128}
                      className="h-32 w-32 rounded-2xl border border-slate-200 bg-white object-contain p-2 shadow-sm"
                    />
                  ) : (
                    <div
                      className="flex h-32 w-32 items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-50 text-2xl font-bold tracking-tight text-slate-600 shadow-sm"
                      aria-hidden
                    >
                      {companyInitials(data.display_name)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    {data.display_name}
                  </h1>
                  {data.tagline.trim() ? (
                    <p className="mt-2 text-base text-slate-600">{data.tagline.trim()}</p>
                  ) : null}
                  {data.website ? (
                    <a
                      href={
                        data.website.startsWith("http") ? data.website : `https://${data.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-block text-sm font-medium text-blue-700 hover:underline"
                    >
                      {data.website}
                    </a>
                  ) : null}
                  {data.about ? (
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                      {data.about}
                    </p>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">Qısa təsvir hələ əlavə edilməyib.</p>
                  )}
                </div>
              </div>
            </header>

            <section>
              <h2 className="text-lg font-bold text-slate-900">Aktiv vakansiyalar</h2>
              {data.jobs.length === 0 ? (
                <p className="mt-3 text-sm text-slate-600">Hazırda aktiv elan yoxdur.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {data.jobs.map((j) => (
                    <li key={j.id}>
                      <Link
                        href={`/jobs/${j.id}`}
                        className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                      >
                        <h3 className="text-lg font-semibold text-slate-900">{j.title}</h3>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          {j.location ? (
                            <span className="jb-chip">{j.location}</span>
                          ) : null}
                          <span className="jb-chip">{workModeLabel(j.work_mode)}</span>
                          <span className="jb-chip">
                            {employmentTypeLabel(j.employment_type || "full_time")}
                          </span>
                          {j.salary_display ? (
                            <span className="jb-chip border-emerald-200 bg-emerald-50 text-emerald-800">
                              {j.salary_display}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm text-slate-600">{j.description}</p>
                        <p className="mt-2 text-sm font-medium text-blue-700">Ətraflı →</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
