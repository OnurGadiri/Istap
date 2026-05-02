"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { apiFetchAuthed } from "@/lib/api";

type WorkMode = "remote" | "hybrid" | "onsite";
type EmploymentType = "full_time" | "part_time" | "contract" | "internship";

type JobMine = {
  id: number;
  title: string;
  description: string;
  company_display_name: string;
  location: string;
  work_mode: WorkMode;
  employment_type: EmploymentType;
  salary_display: string;
  is_active: boolean;
  company_label: string;
};

type AppEmployer = {
  id: number;
  applicant: number;
  applicant_email: string;
  applicant_first_name?: string;
  applicant_last_name?: string;
  applicant_public_slug?: string | null;
  applicant_avatar_url?: string | null;
  status: string;
  cover_letter: string;
  resume_url: string | null;
  created_at: string;
};

function applicantDisplayName(a: AppEmployer): string {
  const fn = (a.applicant_first_name ?? "").trim();
  const ln = (a.applicant_last_name ?? "").trim();
  const name = [fn, ln].filter(Boolean).join(" ");
  return name || a.applicant_email;
}

function applicantInitials(a: AppEmployer): string {
  const fn = (a.applicant_first_name ?? "").trim();
  const ln = (a.applicant_last_name ?? "").trim();
  if (fn && ln) return (fn[0]! + ln[0]!).toUpperCase();
  if (fn.length >= 2) return fn.slice(0, 2).toUpperCase();
  if (fn) return fn[0]!.toUpperCase();
  const em = a.applicant_email?.trim() ?? "";
  return em ? em[0]!.toUpperCase() : "?";
}

const emptyCreate = {
  title: "",
  description: "",
  company_display_name: "",
  location: "",
  work_mode: "remote" as WorkMode,
  employment_type: "full_time" as EmploymentType,
  salary_display: "",
  is_active: true,
};

const CAN_POST_JOBS = new Set(["company", "recruiter", "admin"]);

export default function ManageJobsPage() {
  const [jobs, setJobs] = useState<JobMine[]>([]);
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(emptyCreate);
  const [appsJobId, setAppsJobId] = useState<number | null>(null);
  const [apps, setApps] = useState<AppEmployer[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const meRes = await apiFetchAuthed("/api/auth/me/");
      if (meRes.status === 401) {
        setError("Daxil olun.");
        setJobs([]);
        return;
      }
      if (!meRes.ok) {
        setError("İstifadəçi məlumatı alınmadı.");
        setJobs([]);
        return;
      }
      const me = (await meRes.json()) as { role?: string };
      if (!me.role || !CAN_POST_JOBS.has(me.role)) {
        setError(
          "Vakansiya yerləşdirmək üçün şirkət və ya recruiter hesabı ilə daxil olun (namizəd rolunda bu səhifə mövcud deyil).",
        );
        setJobs([]);
        return;
      }

      const res = await apiFetchAuthed("/api/jobs/mine/");
      if (res.status === 403) {
        setError("Elan siyahısına baxmaq üçün icazə yoxdur.");
        setJobs([]);
        return;
      }
      if (!res.ok) {
        setError("Elanlar yüklənmədi.");
        return;
      }
      const data = (await res.json()) as JobMine[];
      setJobs(Array.isArray(data) ? data : []);
    } catch {
      setError("Şəbəkə xətası.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadApps = useCallback(async (jobId: number) => {
    setAppsLoading(true);
    try {
      const res = await apiFetchAuthed(`/api/jobs/${jobId}/applications/`);
      if (res.ok) {
        const data = (await res.json()) as AppEmployer[];
        setApps(Array.isArray(data) ? data : []);
      } else {
        setApps([]);
      }
    } catch {
      setApps([]);
    } finally {
      setAppsLoading(false);
    }
  }, []);

  function toggleApplications(jobId: number) {
    if (appsJobId === jobId) {
      setAppsJobId(null);
      return;
    }
    setAppsJobId(jobId);
    void loadApps(jobId);
  }

  async function patchAppStatus(appId: number, newStatus: string) {
    const res = await apiFetchAuthed(`/api/jobs/applications/${appId}/`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok && appsJobId !== null) {
      await loadApps(appsJobId);
    }
  }

  function startEdit(j: JobMine) {
    setEditingId(j.id);
    setEditForm({
      title: j.title,
      description: j.description,
      company_display_name: j.company_display_name ?? "",
      location: j.location ?? "",
      work_mode: j.work_mode,
      employment_type: j.employment_type ?? "full_time",
      salary_display: j.salary_display ?? "",
      is_active: j.is_active,
    });
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetchAuthed("/api/jobs/create/", {
        method: "POST",
        body: JSON.stringify(createForm),
      });
      if (res.status === 403) {
        setError("İcazə yoxdur.");
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as Record<
          string,
          unknown
        > | null;
        const msg = body
          ? Object.values(body)
              .flat()
              .map((v) => (Array.isArray(v) ? v.join(" ") : String(v)))
              .join(" ")
          : "";
        setError(msg || "Yaradılmadı.");
        return;
      }
      setCreateForm(emptyCreate);
      await load();
    } catch {
      setError("Şəbəkə xətası.");
    } finally {
      setSaving(false);
    }
  }

  async function onSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (editingId == null) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetchAuthed(`/api/jobs/manage/${editingId}/`, {
        method: "PATCH",
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        setError("Yenilənmədi.");
        return;
      }
      setEditingId(null);
      await load();
    } catch {
      setError("Şəbəkə xətası.");
    } finally {
      setSaving(false);
    }
  }

  async function removeJob(id: number) {
    if (!confirm("Bu elanı silmək istəyirsiniz?")) return;
    setError(null);
    const res = await apiFetchAuthed(`/api/jobs/manage/${id}/`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError("Silinmədi.");
      return;
    }
    if (editingId === id) setEditingId(null);
    await load();
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Elanlarım</h1>
          <p className="mt-1 text-sm text-slate-600">
            Yeni vakansiya əlavə edin və mövcud elanları redaktə edin.
          </p>
        </div>
        <Link href="/jobs" className="text-sm font-medium text-blue-600 hover:underline">
          İctimai siyahıya bax
        </Link>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <section className="glass-panel rounded-2xl p-8">
        <h2 className="text-lg font-medium text-slate-800">Yeni elan</h2>
        <form onSubmit={onCreate} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
            Başlıq
            <input
              required
              value={createForm.title}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, title: e.target.value }))
              }
              className="jb-input w-full py-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
            Təsvir
            <textarea
              required
              rows={5}
              value={createForm.description}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, description: e.target.value }))
              }
              className="jb-input min-h-[140px] w-full py-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Şirkət adı (göstəriləcək)
            <input
              value={createForm.company_display_name}
              onChange={(e) =>
                setCreateForm((f) => ({
                  ...f,
                  company_display_name: e.target.value,
                }))
              }
              className="jb-input w-full py-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Yer
            <input
              value={createForm.location}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, location: e.target.value }))
              }
              className="jb-input w-full py-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            İş rejimi
            <select
              value={createForm.work_mode}
              onChange={(e) =>
                setCreateForm((f) => ({
                  ...f,
                  work_mode: e.target.value as WorkMode,
                }))
              }
              className="jb-input w-full py-3"
            >
              <option value="remote">Uzaqdan</option>
              <option value="hybrid">Hibrid</option>
              <option value="onsite">Ofisdə</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Məşğulluq növü
            <select
              value={createForm.employment_type}
              onChange={(e) =>
                setCreateForm((f) => ({
                  ...f,
                  employment_type: e.target.value as EmploymentType,
                }))
              }
              className="jb-input w-full py-3"
            >
              <option value="full_time">Tam ştat</option>
              <option value="part_time">Yarım ştat</option>
              <option value="contract">Müqavilə</option>
              <option value="internship">Təcrübə</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Maaş (mətn)
            <input
              value={createForm.salary_display}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, salary_display: e.target.value }))
              }
              className="jb-input w-full py-3"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={createForm.is_active}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, is_active: e.target.checked }))
              }
            />
            Aktiv (ictimai siyahıda görünsün)
          </label>
          <button
            type="submit"
            disabled={saving}
            className="jb-btn-primary sm:col-span-2 w-fit px-6 py-3"
          >
            {saving ? "Göndərilir…" : "Elan yarat"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-800">Mövcud elanlar</h2>
        {loading ? (
          <p className="mt-4 text-slate-500">Yüklənir…</p>
        ) : jobs.length === 0 ? (
          <p className="mt-4 text-slate-600">Hələ elan yoxdur.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {jobs.map((j) => (
              <li key={j.id} className="glass-panel rounded-2xl p-6">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-blue-700">{j.company_label}</p>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {j.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {j.is_active ? "Aktiv" : "Deaktiv"} · {j.location || "—"} ·{" "}
                      {j.work_mode} · {j.employment_type}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => toggleApplications(j.id)}
                      className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-50"
                    >
                      {appsJobId === j.id ? "Müraciətləri gizlət" : "Müraciətlər"}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(j)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      Redaktə
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeJob(j.id)}
                      className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50"
                    >
                      Sil
                    </button>
                  </div>
                </div>
                {editingId === j.id ? (
                  <form
                    onSubmit={onSaveEdit}
                    className="mt-6 grid gap-4 border-t border-slate-200 pt-6 sm:grid-cols-2"
                  >
                    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
                      Başlıq
                      <input
                        required
                        value={editForm.title}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, title: e.target.value }))
                        }
                        className="jb-input w-full py-3"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
                      Təsvir
                      <textarea
                        required
                        rows={4}
                        value={editForm.description}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            description: e.target.value,
                          }))
                        }
                        className="jb-input min-h-[120px] w-full py-3"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                      Şirkət adı
                      <input
                        value={editForm.company_display_name}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            company_display_name: e.target.value,
                          }))
                        }
                        className="jb-input w-full py-3"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                      Yer
                      <input
                        value={editForm.location}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, location: e.target.value }))
                        }
                        className="jb-input w-full py-3"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                      İş rejimi
                      <select
                        value={editForm.work_mode}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            work_mode: e.target.value as WorkMode,
                          }))
                        }
                        className="jb-input w-full py-3"
                      >
                        <option value="remote">Uzaqdan</option>
                        <option value="hybrid">Hibrid</option>
                        <option value="onsite">Ofisdə</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                      Məşğulluq növü
                      <select
                        value={editForm.employment_type}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            employment_type: e.target.value as EmploymentType,
                          }))
                        }
                        className="jb-input w-full py-3"
                      >
                        <option value="full_time">Tam ştat</option>
                        <option value="part_time">Yarım ştat</option>
                        <option value="contract">Müqavilə</option>
                        <option value="internship">Təcrübə</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                      Maaş
                      <input
                        value={editForm.salary_display}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            salary_display: e.target.value,
                          }))
                        }
                        className="jb-input w-full py-3"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={editForm.is_active}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            is_active: e.target.checked,
                          }))
                        }
                      />
                      Aktiv
                    </label>
                    <div className="flex flex-wrap gap-2 sm:col-span-2">
                      <button
                        type="submit"
                        disabled={saving}
                        className="jb-btn-primary px-5 py-2.5 text-sm"
                      >
                        Saxla
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="jb-btn-secondary px-5 py-2.5 text-sm"
                      >
                        Ləğv et
                      </button>
                    </div>
                  </form>
                ) : null}
                {appsJobId === j.id ? (
                  <div className="mt-6 border-t border-slate-200 pt-6">
                    <h4 className="text-sm font-medium text-slate-800">Müraciətlər</h4>
                    {appsLoading ? (
                      <p className="mt-2 text-sm text-slate-500">Yüklənir…</p>
                    ) : apps.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-500">Hələ müraciət yoxdur.</p>
                    ) : (
                      <ul className="mt-4 space-y-4">
                        {apps.map((a) => (
                          <li
                            key={a.id}
                            className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex min-w-0 flex-1 items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white">
                                  {a.applicant_avatar_url ? (
                                    <Image
                                      src={a.applicant_avatar_url}
                                      alt=""
                                      width={44}
                                      height={44}
                                      unoptimized
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div
                                      className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-600"
                                      aria-hidden
                                    >
                                      {applicantInitials(a)}
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  {a.applicant_public_slug ? (
                                    <Link
                                      href={`/u/${encodeURIComponent(a.applicant_public_slug)}`}
                                      className="font-semibold text-slate-900 hover:text-blue-700 hover:underline"
                                    >
                                      {applicantDisplayName(a)}
                                    </Link>
                                  ) : (
                                    <span className="font-semibold text-slate-900">
                                      {applicantDisplayName(a)}
                                    </span>
                                  )}
                                  <p className="truncate text-xs text-slate-500">{a.applicant_email}</p>
                                  {!a.applicant_public_slug ? (
                                    <p className="mt-0.5 text-xs text-amber-800">
                                      İctimai profil təyin edilməyib
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                              <select
                                value={a.status}
                                onChange={(e) =>
                                  void patchAppStatus(a.id, e.target.value)
                                }
                                className="jb-input max-w-[11rem] py-1.5 text-sm"
                              >
                                <option value="pending">Gözləmədə</option>
                                <option value="reviewed">Baxılıb</option>
                                <option value="shortlisted">Qısa siyahı</option>
                                <option value="rejected">Rədd</option>
                              </select>
                            </div>
                            {a.resume_url ? (
                              <p className="mt-3">
                                <a
                                  href={a.resume_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium text-blue-700 hover:underline"
                                >
                                  CV-yə bax (yüklə)
                                </a>
                              </p>
                            ) : (
                              <p className="mt-3 text-xs text-slate-500">CV əlavə edilməyib.</p>
                            )}
                            {a.cover_letter ? (
                              <p className="mt-3 whitespace-pre-wrap text-slate-600">
                                {a.cover_letter}
                              </p>
                            ) : null}
                            <p className="mt-2 text-xs text-slate-400">
                              {new Date(a.created_at).toLocaleString("az-AZ")}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
