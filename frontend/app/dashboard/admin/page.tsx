"use client";

import { useCallback, useEffect, useState } from "react";

import { apiFetchAuthed } from "@/lib/api";

type Overview = {
  stats: {
    users_total: number;
    by_role: Record<string, number>;
    jobs_total: number;
    jobs_active: number;
    applications_total: number;
  };
  recent_users: {
    id: number;
    email: string;
    role: string;
    first_name: string;
    last_name: string;
  }[];
};

const roleLabel: Record<string, string> = {
  job_seeker: "Namizəd",
  recruiter: "Recruiter",
  company: "Şirkət",
  admin: "Admin",
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetchAuthed("/api/auth/admin/overview/");
      if (res.status === 403) {
        setError("Bu səhifə yalnız admin üçündür.");
        setData(null);
        return;
      }
      if (!res.ok) {
        setError("Məlumat yüklənmədi.");
        setData(null);
        return;
      }
      setData((await res.json()) as Overview);
    } catch {
      setError("Şəbəkə xətası.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-slate-500">Yüklənir…</p>;
  }
  if (error) {
    return <p className="text-red-600">{error}</p>;
  }
  if (!data) {
    return null;
  }

  const { stats, recent_users } = data;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Admin paneli</h1>
        <p className="mt-2 text-sm text-slate-600">
          Platforma üzrə ümumi göstəricilər və son qeydiyyatlar.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-panel rounded-2xl p-6">
          <p className="text-sm text-slate-500">İstifadəçilər</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.users_total}</p>
        </div>
        <div className="glass-panel rounded-2xl p-6">
          <p className="text-sm text-slate-500">Aktiv elanlar</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.jobs_active}</p>
          <p className="mt-1 text-xs text-slate-500">cəmi {stats.jobs_total}</p>
        </div>
        <div className="glass-panel rounded-2xl p-6">
          <p className="text-sm text-slate-500">Müraciətlər</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {stats.applications_total}
          </p>
        </div>
        <div className="glass-panel rounded-2xl p-6">
          <p className="text-sm text-slate-500">Rollar</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {Object.entries(stats.by_role).map(([role, n]) => (
              <li key={role}>
                {roleLabel[role] ?? role}: <span className="font-medium text-slate-900">{n}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className="glass-panel rounded-2xl p-8">
        <h2 className="text-lg font-medium text-slate-800">Son istifadəçilər</h2>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="pb-3 pr-4 font-medium">E-poçt</th>
                <th className="pb-3 pr-4 font-medium">Rol</th>
                <th className="pb-3 font-medium">Ad</th>
              </tr>
            </thead>
            <tbody>
              {recent_users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 text-slate-600">
                  <td className="py-3 pr-4 font-medium text-slate-800">{u.email}</td>
                  <td className="py-3 pr-4">{roleLabel[u.role] ?? u.role}</td>
                  <td className="py-3">
                    {[u.first_name, u.last_name].filter(Boolean).join(" ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
