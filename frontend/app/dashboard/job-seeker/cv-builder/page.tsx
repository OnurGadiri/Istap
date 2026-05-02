"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { DashboardGate } from "@/components/DashboardGate";
import { apiFetchAuthed } from "@/lib/api";
import type { SessionUser } from "@/lib/session";
import { fetchSessionUser } from "@/lib/session";

type AnalyzeResult = {
  summary?: string;
  strengths?: string[];
  improvements?: string[];
  score?: number;
  model?: string;
};

function CvBuilderContent() {
  const [me, setMe] = useState<SessionUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [analyze, setAnalyze] = useState<AnalyzeResult | null>(null);
  const [analyzeErr, setAnalyzeErr] = useState<string | null>(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);

  useEffect(() => {
    void fetchSessionUser().then((u) => {
      setMe(u ?? null);
      setSessionLoading(false);
    });
  }, []);

  const downloadPdf = useCallback(async () => {
    const res = await apiFetchAuthed("/api/job-seeker/cv/pdf/");
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { detail?: string };
      alert(body.detail || "PDF yüklənmədi.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cv.pdf";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const runAnalyze = useCallback(async () => {
    setAnalyzeLoading(true);
    setAnalyzeErr(null);
    try {
      const res = await apiFetchAuthed("/api/job-seeker/cv/analyze/", {
        method: "POST",
        body: "{}",
      });
      const body = (await res.json().catch(() => ({}))) as AnalyzeResult & {
        detail?: string;
      };
      if (!res.ok) {
        setAnalyze(null);
        setAnalyzeErr(body.detail || "Analiz alınmadı.");
        return;
      }
      setAnalyze(body);
    } catch {
      setAnalyzeErr("Şəbəkə xətası.");
    } finally {
      setAnalyzeLoading(false);
    }
  }, []);

  const premium = Boolean(me?.is_premium_seeker);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">CV qurucu</h1>
        <p className="mt-2 text-sm text-slate-600">
          Şablonları seçin; PDF və AI analizi Premium ilə aktivdir. Profil məlumatları{" "}
          <Link href="/dashboard/job-seeker/profile" className="text-blue-700 underline">
            profil səhifəsində
          </Link>{" "}
          doldurulur.
        </p>
      </div>

      {sessionLoading ? (
        <p className="text-sm text-slate-500">Yüklənir…</p>
      ) : !premium ? (
        <div className="glass-panel rounded-2xl p-8 text-slate-700">
          <p>
            PDF export və AI analizi üçün{" "}
            <Link href="/premium" className="font-medium text-blue-700 underline">
              Premium namizəd
            </Link>{" "}
            planına keçin.
          </p>
        </div>
      ) : null}

      <section className="glass-panel rounded-2xl p-8">
        <h2 className="text-lg font-semibold text-slate-900">Şablonlar</h2>
        <p className="mt-2 text-sm text-slate-600">
          UI nümunələri — sonrakı mərhələdə Canva tipli redaktor əlavə olunacaq.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {["Klassik", "Texniki", "Minimal"].map((name) => (
            <div
              key={name}
              className="rounded-xl border border-slate-200 bg-slate-50/80 p-6 text-center"
            >
              <p className="font-medium text-slate-800">{name}</p>
              <p className="mt-2 text-xs text-slate-500">Tezliklə</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!premium}
          onClick={() => void downloadPdf()}
          className="jb-btn-primary inline-flex disabled:cursor-not-allowed disabled:opacity-50"
        >
          PDF yüklə
        </button>
        <button
          type="button"
          disabled={!premium || analyzeLoading}
          onClick={() => void runAnalyze()}
          className="jb-btn-secondary inline-flex disabled:cursor-not-allowed disabled:opacity-50"
        >
          {analyzeLoading ? "AI işləyir…" : "AI CV analizi"}
        </button>
      </section>

      {analyzeErr ? <p className="text-sm text-red-600">{analyzeErr}</p> : null}

      {analyze ? (
        <div className="glass-panel space-y-4 rounded-2xl p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">AI nəticəsi</h2>
            {typeof analyze.score === "number" ? (
              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-900">
                Bal: {analyze.score}
              </span>
            ) : null}
          </div>
          {analyze.summary ? <p className="text-sm text-slate-700">{analyze.summary}</p> : null}
          {analyze.strengths?.length ? (
            <div>
              <p className="text-sm font-medium text-slate-800">Güclü tərəflər</p>
              <ul className="mt-2 list-inside list-disc text-sm text-slate-600">
                {analyze.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {analyze.improvements?.length ? (
            <div>
              <p className="text-sm font-medium text-slate-800">Tövsiyələr</p>
              <ul className="mt-2 list-inside list-disc text-sm text-slate-600">
                {analyze.improvements.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="text-xs text-slate-400">Model: {analyze.model ?? "—"}</p>
        </div>
      ) : null}
    </div>
  );
}

export default function CvBuilderPage() {
  return (
    <DashboardGate allowedRoles={["job_seeker"]}>
      <CvBuilderContent />
    </DashboardGate>
  );
}
