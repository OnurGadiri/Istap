import { apiFetch, refreshAccessToken } from "@/lib/api";
import { clearTokens, getAccessToken, getRefreshToken } from "@/lib/auth-storage";

export type SessionUser = {
  email: string;
  role: string;
  id?: number;
  is_premium_seeker?: boolean;
  is_premium_employer?: boolean;
  premium_seeker_until?: string | null;
  premium_employer_until?: string | null;
};

export function notifySessionRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("istap-session"));
}

export async function fetchSessionUser(): Promise<SessionUser | null> {
  const access = getAccessToken();
  if (!access) return null;

  async function sessionFetch(token: string) {
    const res = await apiFetch("/api/auth/session/", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as { user?: SessionUser | null };
    return data.user ?? null;
  }

  let user = await sessionFetch(access);
  if (user) return user;

  const refresh = getRefreshToken();
  if (!refresh) {
    clearTokens();
    return null;
  }

  const newAccess = await refreshAccessToken();
  if (!newAccess) {
    clearTokens();
    return null;
  }

  user = await sessionFetch(newAccess);
  if (user) return user;

  clearTokens();
  return null;
}
