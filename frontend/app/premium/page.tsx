"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import { dashboardPathForRole } from "@/lib/auth-storage";
import {
  formatPremiumUntil,
  premiumExpiresAt,
  rolePremiumActive,
} from "@/lib/premium";
import { SiteHeader } from "@/components/SiteHeader";
import { apiFetchAuthed } from "@/lib/api";
import { fetchSessionUser, notifySessionRefresh } from "@/lib/session";
import type { SessionUser } from "@/lib/session";

function PremiumPageInner() {
  const searchParams = useSearchParams();
  const checkout = searchParams.get("checkout");
  const [me, setMe] = useState<SessionUser | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const loadMe = useCallback(async () => {
    const u = await fetchSessionUser();
    setMe(u ?? null);
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (checkout !== "success" || !sessionId) return;
    let cancelled = false;
    void (async () => {
      const res = await apiFetchAuthed("/api/billing/post-checkout/", {
        method: "POST",
        body: JSON.stringify({ session_id: sessionId }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        user?: SessionUser;
        detail?: string;
      };
      if (cancelled) return;
      if (res.ok && body.user) {
        setMe(body.user);
        notifySessionRefresh();
        return;
      }
      if (!res.ok && body.detail) {
        setError(body.detail);
      }
      await loadMe();
      notifySessionRefresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [checkout, sessionId, loadMe]);

  async function startCheckout(plan: "seeker" | "employer") {
    setError(null);
    setLoadingPlan(plan);
    try {
      const res = await apiFetchAuthed("/api/billing/checkout/", {
        method: "POST",
        body: JSON.stringify({ plan }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        checkout_url?: string;
        detail?: string;
      };
      if (!res.ok) {
        setError(body.detail || "Ödəniş səhifəsi açılmadı.");
        return;
      }
      if (body.checkout_url) {
        window.location.href = body.checkout_url;
        return;
      }
      setError("Checkout ünvanı alınmadı.");
    } catch {
      setError("Şəbəkə xətası.");
    } finally {
      setLoadingPlan(null);
    }
  }

  const notice =
    checkout === "success" && me && !rolePremiumActive(me)
      ? "Ödəniş tamamlandı. Status yenilənir…"
      : checkout === "cancel"
        ? "Ödəniş ləğv edildi."
        : null;

  const panelHref = me ? dashboardPathForRole(me.role) : "/";

  return (
    <div className="flex min-h-full flex-1 flex-col bg-slate-50/80">
      <SiteHeader containerClassName="max-w-5xl" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <p className="text-sm text-slate-500">
          <Link href="/" className="font-medium text-blue-700 hover:underline">
            ← Ana səhifə
          </Link>
        </p>

        {me === undefined ? (
          <p className="mt-10 text-sm text-slate-500">Yüklənir…</p>
        ) : !me ? (
          <>
            <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
              Istap Premium
            </h1>
            <div className="mt-10 glass-panel rounded-2xl p-8">
              <p className="text-slate-700">
                Premium satın almaq üçün əvvəlcə{" "}
                <Link href="/login" className="font-medium text-blue-700 underline">
                  daxil olun
                </Link>{" "}
                və ya{" "}
                <Link href="/register" className="font-medium text-blue-700 underline">
                  hesab yaradın
                </Link>
                .
              </p>
            </div>
          </>
        ) : rolePremiumActive(me) ? (
          <>
            <h1 className="mt-6 text-3xl font-bold tracking-tight text-emerald-900">
              Siz artıq Premiumsunuz
            </h1>
            <p className="mt-3 max-w-2xl text-slate-600">
              Bu səhifədə yeni ödənişə ehtiyac yoxdur. Premium üstünlüklərindən panel və
              profildən istifadə edin.
            </p>
            <div className="mt-8 rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 via-white to-emerald-50 px-6 py-8 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Cari bitmə tarixi</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">
                {formatPremiumUntil(premiumExpiresAt(me))}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={panelHref} className="jb-btn-primary inline-flex">
                  Panelə keç
                </Link>
                {me.role === "job_seeker" ? (
                  <Link
                    href="/dashboard/job-seeker/profile"
                    className="jb-btn-secondary inline-flex"
                  >
                    Profilimdə bax
                  </Link>
                ) : null}
                {(me.role === "company" || me.role === "recruiter") && (
                  <Link
                    href="/dashboard/jobs/manage"
                    className="jb-btn-secondary inline-flex"
                  >
                    Elanlarım
                  </Link>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
              Istap Premium
            </h1>
            <p className="mt-3 max-w-2xl text-slate-600">
              Namizəd və şirkət üçün ayrıca planlar. Ödəniş Stripe test mühitində təhlükəsiz
              Checkout ilə aparılır.
            </p>

            {notice ? (
              <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                {notice}
              </p>
            ) : null}

            {error ? (
              <p className="mt-6 text-sm font-medium text-red-600">{error}</p>
            ) : null}

            <div className="mt-10 grid gap-8 lg:grid-cols-2">
              <section className="glass-panel flex flex-col rounded-2xl p-8">
                <h2 className="text-xl font-semibold text-slate-900">Namizəd Premium</h2>
                <p className="mt-2 text-3xl font-bold text-blue-800">₼14.99 / ay</p>
                <ul className="mt-6 list-inside list-disc space-y-2 text-sm text-slate-600">
                  <li>Axtarışda namizəd profilləri üst sıralarda</li>
                  <li>CV PDF export və premium şablonlar (CV qurucu)</li>
                  <li>Müraciət statistikası və profilə “kim baxıb”</li>
                  <li>AI CV analizi</li>
                  <li>Sponsor reklamları yoxdur</li>
                </ul>
                {me.role === "job_seeker" ? (
                  <button
                    type="button"
                    disabled={loadingPlan !== null}
                    onClick={() => void startCheckout("seeker")}
                    className="jb-btn-primary mt-8 inline-flex justify-center disabled:opacity-60"
                  >
                    {loadingPlan === "seeker" ? "Yönləndirilir…" : "Davam et — Namizəd"}
                  </button>
                ) : (
                  <p className="mt-8 text-sm text-amber-800">
                    Bu plan yalnız namizəd hesabı ilə aktivləşdirilir.
                  </p>
                )}
              </section>

              <section className="glass-panel flex flex-col rounded-2xl p-8">
                <h2 className="text-xl font-semibold text-slate-900">Şirkət Premium</h2>
                <p className="mt-2 text-3xl font-bold text-indigo-800">₼49.99 / ay</p>
                <ul className="mt-6 list-inside list-disc space-y-2 text-sm text-slate-600">
                  <li>Vakansiya siyahısında üst sıra və “Premium şirkət” nişanı</li>
                  <li>Daha çox aktiv elan limiti</li>
                  <li>Elan baxışları və müraciət analitikası</li>
                  <li>Sponsor reklamları yoxdur</li>
                </ul>
                {me.role === "company" || me.role === "recruiter" ? (
                  <button
                    type="button"
                    disabled={loadingPlan !== null}
                    onClick={() => void startCheckout("employer")}
                    className="jb-btn-primary mt-8 inline-flex justify-center bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {loadingPlan === "employer" ? "Yönləndirilir…" : "Davam et — Şirkət"}
                  </button>
                ) : (
                  <p className="mt-8 text-sm text-amber-800">
                    Bu plan yalnız şirkət və ya recruiter hesabı ilə aktivləşdirilir.
                  </p>
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function PremiumPage() {
  return (
    <Suspense fallback={<p className="p-10 text-sm text-slate-500">Yüklənir…</p>}>
      <PremiumPageInner />
    </Suspense>
  );
}
