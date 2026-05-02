"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { SiteHeader } from "@/components/SiteHeader";
import { apiFetch } from "@/lib/api";

type JobSeekerPublic = {
  public_slug: string;
  first_name: string;
  last_name: string;
  bio: string;
  location: string;
  work_mode: string;
  skills: string;
  languages: string;
  preferred_countries: string;
  salary_expectation: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  avatar_url: string | null;
};

function workModeLabel(m: string): string {
  const map: Record<string, string> = {
    remote: "Uzaqdan",
    hybrid: "Hibrid",
    onsite: "Ofisdə",
  };
  return map[m] ?? m;
}

function commaTokens(s: string): string[] {
  return s
    .split(/[,，]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function initials(first: string, last: string): string {
  const a = first.trim();
  const b = last.trim();
  if (a && b) return (a[0]! + b[0]!).toUpperCase();
  if (a.length >= 2) return a.slice(0, 2).toUpperCase();
  if (a) return a[0]!.toUpperCase();
  return "?";
}

export default function JobSeekerPublicPage() {
  const params = useParams();
  const slugParam = params.slug;
  const slug = typeof slugParam === "string" ? slugParam : slugParam?.[0] ?? "";

  const [data, setData] = useState<JobSeekerPublic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!slug) return;
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch(
        `/api/job-seeker/public/${encodeURIComponent(slug)}/`,
      );
      if (res.status === 404) {
        setError("Bu ünvanla namizəd profili tapılmadı və ya ictimai deyil.");
        setData(null);
        return;
      }
      if (!res.ok) {
        setError("Məlumat yüklənmədi.");
        setData(null);
        return;
      }
      setData((await res.json()) as JobSeekerPublic);
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

  const fullName = data
    ? [data.first_name, data.last_name].map((s) => s.trim()).filter(Boolean).join(" ")
    : "";

  return (
    <div className="flex min-h-full flex-1 flex-col bg-slate-50/50">
      <SiteHeader containerClassName="max-w-3xl" />
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link href="/jobs" className="font-medium text-blue-700 hover:underline">
            ← Vakansiyalar
          </Link>
          <Link href="/" className="text-slate-500 hover:text-slate-800">
            Ana səhifə
          </Link>
        </div>

        {loading ? (
          <p className="text-slate-600">Yüklənir…</p>
        ) : error ? (
          <p className="text-sm font-medium text-red-600">{error}</p>
        ) : data ? (
          <article className="glass-panel rounded-2xl p-6 sm:p-8">
            <div className="flex flex-wrap items-start gap-5">
              <div className="flex h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                {data.avatar_url ? (
                  <Image
                    src={data.avatar_url}
                    alt=""
                    width={96}
                    height={96}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-xl font-bold text-slate-600"
                    aria-hidden
                  >
                    {initials(data.first_name, data.last_name)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {fullName || "Namizəd"}
                </h1>
                <p className="mt-1 font-mono text-xs text-slate-500">/u/{data.public_slug}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.location ? <span className="jb-chip">{data.location}</span> : null}
                  <span className="jb-chip">{workModeLabel(data.work_mode)}</span>
                  {data.salary_expectation ? (
                    <span className="jb-chip border-emerald-200 bg-emerald-50 text-emerald-800">
                      {data.salary_expectation}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {data.bio ? (
              <div className="mt-8 border-t border-slate-100 pt-6">
                <h2 className="text-base font-bold text-slate-900">Haqqında</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {data.bio}
                </p>
              </div>
            ) : null}

            {commaTokens(data.skills).length > 0 ? (
              <div className="mt-8 border-t border-slate-100 pt-6">
                <h2 className="text-base font-bold text-slate-900">Bacarıqlar</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {commaTokens(data.skills).map((t) => (
                    <span key={t} className="jb-chip">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {commaTokens(data.languages).length > 0 ? (
              <div className="mt-6">
                <h2 className="text-base font-bold text-slate-900">Dillər</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {commaTokens(data.languages).map((t) => (
                    <span key={t} className="jb-chip">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {commaTokens(data.preferred_countries).length > 0 ? (
              <div className="mt-6">
                <h2 className="text-base font-bold text-slate-900">Üstünlük verilən ölkələr</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {commaTokens(data.preferred_countries).map((t) => (
                    <span key={t} className="jb-chip">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {(data.linkedin_url || data.github_url || data.portfolio_url) && (
              <div className="mt-8 border-t border-slate-100 pt-6">
                <h2 className="text-base font-bold text-slate-900">Keçidlər</h2>
                <ul className="mt-3 space-y-2 text-sm font-medium">
                  {data.linkedin_url ? (
                    <li>
                      <a
                        href={data.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 hover:underline"
                      >
                        LinkedIn
                      </a>
                    </li>
                  ) : null}
                  {data.github_url ? (
                    <li>
                      <a
                        href={data.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 hover:underline"
                      >
                        GitHub
                      </a>
                    </li>
                  ) : null}
                  {data.portfolio_url ? (
                    <li>
                      <a
                        href={data.portfolio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 hover:underline"
                      >
                        Portfolio
                      </a>
                    </li>
                  ) : null}
                </ul>
              </div>
            )}
          </article>
        ) : null}
      </div>
    </div>
  );
}
