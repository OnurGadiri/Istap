import type { SessionUser } from "@/lib/session";

export function rolePremiumActive(u: SessionUser | null | undefined): boolean {
  if (!u) return false;
  if (u.role === "job_seeker") return Boolean(u.is_premium_seeker);
  if (u.role === "company" || u.role === "recruiter") {
    return Boolean(u.is_premium_employer);
  }
  return false;
}

export function premiumExpiresAt(u: SessionUser): string | null {
  if (u.role === "job_seeker" && u.is_premium_seeker) {
    return u.premium_seeker_until ?? null;
  }
  if (
    (u.role === "company" || u.role === "recruiter") &&
    u.is_premium_employer
  ) {
    return u.premium_employer_until ?? null;
  }
  return null;
}

export function formatPremiumUntil(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;

    const formatted = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Baku",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(d);

    return formatted.replace(/\//g, ".").replace(",", " ·");
  } catch {
    return String(iso);
  }
}
