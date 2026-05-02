"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { dashboardPathForRole, setTokens } from "@/lib/auth-storage";
import { fetchSessionUser, notifySessionRefresh } from "@/lib/session";

type MeResponse = { role: string };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetchSessionUser().then((u) => {
      if (u) router.replace(dashboardPathForRole(u.role));
    });
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch("/api/token/", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as {
        access?: string;
        refresh?: string;
        detail?: string | string[];
      };
      if (!res.ok) {
        const d = data.detail;
        const msg = Array.isArray(d)
          ? d.join(" ")
          : typeof d === "string"
            ? d
            : "Giriş alınmadı.";
        setError(msg);
        return;
      }
      if (!data.access || !data.refresh) {
        setError("Cavab gözlənilməzdir.");
        return;
      }
      setTokens(data.access, data.refresh);
      const meRes = await apiFetch("/api/auth/me/", {
        headers: { Authorization: `Bearer ${data.access}` },
      });
      const me = (await meRes.json()) as MeResponse;
      notifySessionRefresh();
      router.push(dashboardPathForRole(me.role));
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
          <h1 className="text-2xl font-semibold text-slate-900">Giriş</h1>
          <p className="mt-2 text-sm text-slate-600">
            Hesabınız yoxdur?{" "}
            <Link href="/register" className="font-medium text-blue-600 hover:underline">
              Qeydiyyat
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
              Parol
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {loading ? "Gözləyin…" : "Daxil ol"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
