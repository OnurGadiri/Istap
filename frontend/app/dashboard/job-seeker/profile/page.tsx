"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { apiFetchAuthed, apiFetchAuthedFormData } from "@/lib/api";
import {
  formatPremiumUntil,
  premiumExpiresAt,
  rolePremiumActive,
} from "@/lib/premium";
import { fetchSessionUser, type SessionUser } from "@/lib/session";

type WorkMode = "remote" | "hybrid" | "onsite";

type ProfilePayload = {
  public_slug: string;
  bio: string;
  location: string;
  work_mode: WorkMode;
  salary_expectation: string;
  preferred_countries: string;
  languages: string;
  skills: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
};

type ProfileApi = ProfilePayload & { avatar?: string | null };

const emptyForm: ProfilePayload = {
  public_slug: "",
  bio: "",
  location: "",
  work_mode: "remote",
  salary_expectation: "",
  preferred_countries: "",
  languages: "",
  skills: "",
  linkedin_url: "",
  github_url: "",
  portfolio_url: "",
};

function formFromApi(data: ProfileApi): ProfilePayload {
  return {
    public_slug: data.public_slug ?? "",
    bio: data.bio ?? "",
    location: data.location ?? "",
    work_mode: (data.work_mode as WorkMode) ?? "remote",
    salary_expectation: data.salary_expectation ?? "",
    preferred_countries: data.preferred_countries ?? "",
    languages: data.languages ?? "",
    skills: data.skills ?? "",
    linkedin_url: data.linkedin_url ?? "",
    github_url: data.github_url ?? "",
    portfolio_url: data.portfolio_url ?? "",
  };
}

function formatApiErrors(body: Record<string, unknown> | null): string {
  if (!body) return "";
  const parts: string[] = [];
  for (const v of Object.values(body)) {
    if (Array.isArray(v)) parts.push(...v.map(String));
    else if (typeof v === "string") parts.push(v);
  }
  return parts.join(" ");
}

export default function JobSeekerProfilePage() {
  const [form, setForm] = useState<ProfilePayload>(emptyForm);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionUser, setSessionUser] = useState<SessionUser | null | undefined>(
    undefined,
  );

  const loadSession = useCallback(async () => {
    const u = await fetchSessionUser();
    setSessionUser(u ?? null);
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    const onRefresh = () => void loadSession();
    window.addEventListener("istap-session", onRefresh);
    return () => window.removeEventListener("istap-session", onRefresh);
  }, [loadSession]);

  const applyApi = useCallback((data: ProfileApi) => {
    setForm(formFromApi(data));
    setAvatarUrl(
      typeof data.avatar === "string" && data.avatar.length > 0
        ? data.avatar
        : null,
    );
  }, []);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetchAuthed("/api/job-seeker/profile/");
      if (res.status === 403) {
        setError("Bu səhifə yalnız namizəd rolü üçündür.");
        setForm(emptyForm);
        setAvatarUrl(null);
        return;
      }
      if (res.status === 401) {
        setError("Daxil olun (JWT etibarlı deyil və ya yoxdur).");
        return;
      }
      if (!res.ok) {
        setError("Profil yüklənmədi.");
        return;
      }
      const data = (await res.json()) as ProfileApi;
      applyApi(data);
    } catch {
      setError("Şəbəkə xətası.");
    } finally {
      setLoading(false);
    }
  }, [applyApi]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!pendingFile) {
      setPendingPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPendingPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  async function removeAvatar() {
    setSuccess(false);
    setError(null);
    setSaving(true);
    try {
      const res = await apiFetchAuthed("/api/job-seeker/profile/", {
        method: "PATCH",
        body: JSON.stringify({ avatar: null }),
      });
      if (res.status === 403) {
        setError("Bu əməliyyat yalnız namizəd rolü üçündür.");
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as Record<
          string,
          unknown
        > | null;
        setError(formatApiErrors(body) || "Şəkil silinmədi.");
        return;
      }
      setPendingFile(null);
      applyApi((await res.json()) as ProfileApi);
      setSuccess(true);
    } catch {
      setError("Şəbəkə xətası.");
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSuccess(false);
    setError(null);
    setSaving(true);
    try {
      let res: Response;
      if (pendingFile) {
        const fd = new FormData();
        fd.append("public_slug", form.public_slug.trim());
        fd.append("bio", form.bio);
        fd.append("location", form.location);
        fd.append("work_mode", form.work_mode);
        fd.append("salary_expectation", form.salary_expectation);
        fd.append("preferred_countries", form.preferred_countries);
        fd.append("languages", form.languages);
        fd.append("skills", form.skills);
        fd.append("linkedin_url", form.linkedin_url);
        fd.append("github_url", form.github_url);
        fd.append("portfolio_url", form.portfolio_url);
        fd.append("avatar", pendingFile);
        res = await apiFetchAuthedFormData("/api/job-seeker/profile/", fd, {
          method: "PATCH",
        });
      } else {
        res = await apiFetchAuthed("/api/job-seeker/profile/", {
          method: "PATCH",
          body: JSON.stringify(form),
        });
      }
      if (res.status === 403) {
        setError("Bu əməliyyat yalnız namizəd rolü üçündür.");
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as Record<
          string,
          unknown
        > | null;
        setError(formatApiErrors(body) || "Yadda saxlanılmadı.");
        return;
      }
      setSuccess(true);
      setPendingFile(null);
      applyApi((await res.json()) as ProfileApi);
    } catch {
      setError("Şəbəkə xətası.");
    } finally {
      setSaving(false);
    }
  }

  function field<K extends keyof ProfilePayload>(key: K, value: ProfilePayload[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const previewSrc = pendingPreviewUrl ?? avatarUrl;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Namizəd profili</h1>
          <p className="mt-1 text-sm text-slate-600">
            Məlumatlarınızı yeniləyin; dəyişikliklər JWT ilə API-yə yazılır.
          </p>
        </div>
        <Link
          href="/dashboard/job-seeker"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Panelə qayıt
        </Link>
      </div>

      {sessionUser && rolePremiumActive(sessionUser) ? (
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-emerald-50 px-5 py-4 shadow-sm">
          <p className="text-sm font-semibold text-emerald-900">Namizəd Premium aktivdir</p>
          <p className="mt-1 text-sm text-slate-700">
            Bitmə tarixi:{" "}
            <span className="font-medium text-slate-900">
              {formatPremiumUntil(premiumExpiresAt(sessionUser))}
            </span>
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Üstünlüklər aktivdir; status ödənişdən sonra bir neçə saniyə ərzində yenilənir.
          </p>
        </div>
      ) : null}

      {loading ? (
        <p className="text-slate-500">Yüklənir…</p>
      ) : (
        <form
          onSubmit={onSubmit}
          className="glass-panel space-y-6 rounded-2xl p-8 sm:p-10"
        >
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-slate-900">İctimai profil keçidi</h2>
            <p className="mt-1 text-xs text-slate-600">
              Boş buraxsanız, ictimai səhifə aktiv olmaz. Yalnız latın hərfləri, rəqəm və tire.
            </p>
            <label className="mt-3 flex flex-col gap-1 text-sm font-medium text-slate-700">
              Ünvan (slug)
              <input
                value={form.public_slug}
                onChange={(e) => field("public_slug", e.target.value)}
                placeholder="meselen-ad-soyad"
                className="jb-input w-full max-w-md py-3"
              />
            </label>
            {form.public_slug.trim() ? (
              <p className="mt-2 text-sm">
                <Link
                  href={`/u/${encodeURIComponent(form.public_slug.trim().toLowerCase())}`}
                  className="font-medium text-blue-700 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  İctimai profil: /u/{form.public_slug.trim().toLowerCase()} →
                </Link>
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                Slug təyin edildikdən sonra burada keçid görünəcək.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Profil şəkli</span>
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                {previewSrc ? (
                  <Image
                    src={previewSrc}
                    alt="Avatar"
                    width={96}
                    height={96}
                    unoptimized={Boolean(pendingPreviewUrl)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="px-2 text-center text-xs text-slate-500">
                    Şəkil yoxdur
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <input
                type="file"
                accept="image/*"
                className="max-w-xs text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-slate-800 file:font-medium"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setPendingFile(f);
                }}
              />
              {avatarUrl && !pendingFile ? (
                <button
                  type="button"
                  onClick={() => void removeAvatar()}
                  disabled={saving}
                  className="w-fit text-sm text-red-600 hover:underline disabled:opacity-50"
                >
                  Şəkli sil
                </button>
              ) : null}
            </div>
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Özünüz haqqında
            <textarea
              value={form.bio}
              onChange={(e) => field("bio", e.target.value)}
              rows={4}
              className="jb-input w-full min-h-[120px] py-3"
            />
          </label>
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Yer / şəhər
              <input
                value={form.location}
                onChange={(e) => field("location", e.target.value)}
                className="jb-input w-full py-3"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              İş rejimi
              <select
                value={form.work_mode}
                onChange={(e) => field("work_mode", e.target.value as WorkMode)}
                className="jb-input w-full py-3"
              >
                <option value="remote">Uzaqdan</option>
                <option value="hybrid">Hibrid</option>
                <option value="onsite">Ofisdə</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
              Maaş gözləntisi
              <input
                value={form.salary_expectation}
                onChange={(e) => field("salary_expectation", e.target.value)}
                placeholder="Məs. 3000–4000 AZN"
                className="jb-input w-full py-3"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
              Üstünlük verilən ölkələr
              <input
                value={form.preferred_countries}
                onChange={(e) => field("preferred_countries", e.target.value)}
                placeholder="Vergüllə ayırın"
                className="jb-input w-full py-3"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
              Dillər
              <input
                value={form.languages}
                onChange={(e) => field("languages", e.target.value)}
                className="jb-input w-full py-3"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
              Bacarıqlar (vergüllə)
              <input
                value={form.skills}
                onChange={(e) => field("skills", e.target.value)}
                className="jb-input w-full py-3"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              LinkedIn
              <input
                type="url"
                value={form.linkedin_url}
                onChange={(e) => field("linkedin_url", e.target.value)}
                className="jb-input w-full py-3"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              GitHub
              <input
                type="url"
                value={form.github_url}
                onChange={(e) => field("github_url", e.target.value)}
                className="jb-input w-full py-3"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
              Portfolio
              <input
                type="url"
                value={form.portfolio_url}
                onChange={(e) => field("portfolio_url", e.target.value)}
                className="jb-input w-full py-3"
              />
            </label>
          </div>

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="text-sm font-medium text-emerald-700">Yadda saxlanıldı.</p>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="jb-btn-primary px-6 py-3"
          >
            {saving ? "Saxlanılır…" : "Yadda saxla"}
          </button>
        </form>
      )}
    </div>
  );
}
