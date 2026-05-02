"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { apiFetchAuthed, apiFetchAuthedFormData } from "@/lib/api";

type ProfileMine = {
  slug: string | null;
  about: string;
  website: string;
  tagline: string;
  display_name: string;
  logo_url: string | null;
};

function formatErrors(body: unknown): string {
  if (!body || typeof body !== "object") return "Yadda saxlanılmadı.";
  const parts: string[] = [];
  for (const v of Object.values(body as Record<string, unknown>)) {
    if (Array.isArray(v)) parts.push(...v.map(String));
    else if (typeof v === "string") parts.push(v);
  }
  return parts.length ? parts.join(" ") : "Yadda saxlanılmadı.";
}

export function EmployerProfileSettings() {
  const [profile, setProfile] = useState<ProfileMine | null>(null);
  const [slug, setSlug] = useState("");
  const [about, setAbout] = useState("");
  const [website, setWebsite] = useState("");
  const [tagline, setTagline] = useState("");
  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const applyProfile = useCallback((data: ProfileMine) => {
    setProfile(data);
    setSlug(data.slug ?? "");
    setAbout(data.about ?? "");
    setWebsite(data.website ?? "");
    setTagline(data.tagline ?? "");
  }, []);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetchAuthed("/api/companies/mine/");
      if (res.status === 403) {
        setError("Bu bölmə yalnız şirkət və ya recruiter üçündür.");
        setProfile(null);
        return;
      }
      if (!res.ok) {
        setError("Profil yüklənmədi.");
        setProfile(null);
        return;
      }
      const data = (await res.json()) as ProfileMine;
      applyProfile(data);
    } catch {
      setError("Şəbəkə xətası.");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [applyProfile]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!pendingLogo) {
      setPendingPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingLogo);
    setPendingPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingLogo]);

  async function removeLogo() {
    setOk(false);
    setError(null);
    setSaving(true);
    try {
      const res = await apiFetchAuthed("/api/companies/mine/", {
        method: "PATCH",
        body: JSON.stringify({ logo: null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(formatErrors(data));
        return;
      }
      setPendingLogo(null);
      applyProfile(data as ProfileMine);
      setOk(true);
    } catch {
      setError("Şəbəkə xətası.");
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setOk(false);
    setError(null);
    setSaving(true);
    try {
      let res: Response;
      if (pendingLogo) {
        const fd = new FormData();
        fd.append("slug", slug.trim());
        fd.append("about", about);
        fd.append("website", website.trim());
        fd.append("tagline", tagline.trim());
        fd.append("logo", pendingLogo);
        res = await apiFetchAuthedFormData("/api/companies/mine/", fd, {
          method: "PATCH",
        });
      } else {
        res = await apiFetchAuthed("/api/companies/mine/", {
          method: "PATCH",
          body: JSON.stringify({
            slug: slug.trim() || null,
            about,
            website: website.trim(),
            tagline: tagline.trim(),
          }),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(formatErrors(data));
        return;
      }
      applyProfile(data as ProfileMine);
      setPendingLogo(null);
      setOk(true);
    } catch {
      setError("Şəbəkə xətası.");
    } finally {
      setSaving(false);
    }
  }

  const logoPreview = pendingPreviewUrl ?? profile?.logo_url ?? null;

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-6">
        <p className="text-sm text-slate-500">Yüklənir…</p>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="glass-panel rounded-2xl p-6">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-slate-900">İctimai şirkət səhifəsi</h2>
      <p className="mt-1 text-sm text-slate-600">
        Loqo, sloqan, unikal ünvan (slug), təsvir və veb sayt. Göstərilən ad aktiv elanlarınızdakı şirkət
        adından götürülür.
      </p>
      {profile ? (
        <p className="mt-2 text-sm text-slate-500">
          Cari göstərici ad:{" "}
          <span className="font-medium text-slate-800">{profile.display_name}</span>
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Şirkət loqosu</span>
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {logoPreview ? (
                <Image
                  src={logoPreview}
                  alt="Loqo"
                  width={112}
                  height={112}
                  unoptimized={Boolean(pendingPreviewUrl)}
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <span className="px-2 text-center text-xs text-slate-500">Loqo yoxdur</span>
              )}
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <input
              type="file"
              accept="image/*"
              className="max-w-md text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-slate-800 file:font-medium"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setPendingLogo(f);
              }}
            />
            {profile?.logo_url && !pendingLogo ? (
              <button
                type="button"
                onClick={() => void removeLogo()}
                disabled={saving}
                className="w-fit text-sm text-red-600 hover:underline disabled:opacity-50"
              >
                Loqonu sil
              </button>
            ) : null}
          </div>
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Sloqan (ictimai səhifədə başlıq altında, bir sətir)
          <input
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            maxLength={160}
            placeholder="Məs. Texnologiya və innovasiya"
            className="jb-input w-full"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Ünvan (yalnız latın hərfləri, rəqəm, tire)
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="meselen-bu-tech"
            className="jb-input w-full"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Haqqında
          <textarea
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            rows={4}
            className="jb-input min-h-[100px] w-full resize-y"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Veb sayt
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://"
            className="jb-input w-full"
          />
        </label>
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {ok ? (
          <p className="text-sm font-medium text-emerald-700">Yadda saxlanıldı.</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={saving} className="jb-btn-primary disabled:opacity-60">
            {saving ? "Saxlanılır…" : "Yadda saxla"}
          </button>
          {slug.trim() ? (
            <Link
              href={`/companies/${encodeURIComponent(slug.trim().toLowerCase())}`}
              className="text-sm font-medium text-blue-700 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Səhifəyə bax →
            </Link>
          ) : null}
        </div>
      </form>
    </div>
  );
}
