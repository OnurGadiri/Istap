"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { dashboardPathForRole, setTokens } from "@/lib/auth-storage";
import { fetchSessionUser, notifySessionRefresh } from "@/lib/session";

const ROLES = [
  { value: "job_seeker", label: "Namizəd" },
  { value: "recruiter", label: "Recruiter" },
  { value: "company", label: "Şirkət" },
] as const;

type RegisterResponse = {
  access?: string;
  refresh?: string;
  user?: { role: string };
};

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [role, setRole] = useState<string>("job_seeker");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetchSessionUser().then((u) => {
      if (u) router.replace(dashboardPathForRole(u.role));
    });
  }, [router]);

  function formatErrors(body: unknown): string {
    if (!body || typeof body !== "object") return "Qeydiyyat alınmadı.";
    const parts: string[] = [];
    for (const v of Object.values(body as Record<string, unknown>)) {
      if (Array.isArray(v)) parts.push(...v.map(String));
      else if (typeof v === "string") parts.push(v);
    }
    return parts.length ? parts.join(" ") : "Qeydiyyat alınmadı.";
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/register/", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          password_confirm: passwordConfirm,
          role,
          first_name: firstName,
          last_name: lastName,
        }),
      });
      const data = (await res.json()) as RegisterResponse & Record<string, unknown>;
      if (!res.ok) {
        setError(formatErrors(data));
        return;
      }
      if (!data.access || !data.refresh || !data.user?.role) {
        setError("Cavab gözlənilməzdir.");
        return;
      }
      setTokens(data.access, data.refresh);
      notifySessionRefresh();
      router.push(dashboardPathForRole(data.user.role));
    } catch {
      setError("Şəbəkə xətası.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-16">
      <div className="mx-auto w-full max-w-md">
        <Link href="/" className="mb-8 inline-flex items-center gap-3">
          <Image
            src="/loqo.jpeg"
            alt="Istap"
            width={160}
            height={48}
            className="h-10 w-auto max-h-10 object-contain"
            priority
          />
        </Link>
        <div className="glass-panel rounded-2xl p-8">
          <h1 className="text-2xl font-semibold text-slate-900">Qeydiyyat</h1>
          <p className="mt-2 text-sm text-slate-600">
            Artıq hesabınız var?{" "}
            <Link href="/login" className="font-medium text-blue-600 hover:underline">
              Giriş
            </Link>
          </p>
          <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              E-poçt
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="jb-input w-full py-3"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Rol
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="jb-input w-full py-3"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Ad
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="jb-input w-full py-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Soyad
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="jb-input w-full py-3"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Parol
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="jb-input w-full py-3"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Parol təsdiqi
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="jb-input w-full py-3"
              />
            </label>
            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="jb-btn-primary mt-2 w-full py-3"
            >
              {loading ? "Gözləyin…" : "Hesab yarat"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
