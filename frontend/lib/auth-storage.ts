const ACCESS = "istap_access";
const REFRESH = "istap_refresh";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH);
}

export function setTokens(access: string, refresh: string): void {
  window.localStorage.setItem(ACCESS, access);
  window.localStorage.setItem(REFRESH, refresh);
}

/** Yalnız access yenilənəndə (JWT refresh endpoint). */
export function setAccessToken(access: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS, access);
}

export function clearTokens(): void {
  window.localStorage.removeItem(ACCESS);
  window.localStorage.removeItem(REFRESH);
}

export function dashboardPathForRole(role: string): string {
  const map: Record<string, string> = {
    job_seeker: "/dashboard/job-seeker",
    recruiter: "/dashboard/recruiter",
    company: "/dashboard/company",
    admin: "/dashboard/admin",
  };
  return map[role] ?? "/dashboard/job-seeker";
}
