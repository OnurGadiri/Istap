import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
} from "@/lib/auth-storage";

export function getApiBase(): string {
  let base =
    process.env.NEXT_PUBLIC_DJANGO_URL?.replace(/\/$/, "") ??
    "http://127.0.0.1:8000";
  // Əksər endpointlər kökdən /api/... ilə gedir; baza səhvən .../api olmasın.
  base = base.replace(/\/api$/i, "");
  return base;
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${getApiBase()}${path.startsWith("/") ? path : `/${path}`}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

/** Access bitəndə refresh token ilə yeni access alır. */
export async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const refresh = getRefreshToken();
  if (!refresh) return null;
  const res = await fetch(`${getApiBase()}/api/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access?: string };
  if (!data.access) return null;
  setAccessToken(data.access);
  return data.access;
}

/** Adds JWT from localStorage when invoked in the browser (SSR: no header). */
export async function apiFetchAuthed(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const withAuth = (access: string | null) =>
    apiFetch(path, {
      ...init,
      headers: {
        ...init?.headers,
        ...(access ? { Authorization: `Bearer ${access}` } : {}),
      },
    });

  const token = getAccessToken();
  let res = await withAuth(token);
  if (res.status === 401 && getRefreshToken()) {
    const newAccess = await refreshAccessToken();
    if (newAccess) res = await withAuth(newAccess);
  }
  return res;
}

/** Multipart (məs. şəkil); Content-Type əlavə etməyin — brauzer boundary qoyur. */
export async function apiFetchAuthedFormData(
  path: string,
  formData: FormData,
  init?: Omit<RequestInit, "body">,
): Promise<Response> {
  const url = `${getApiBase()}${path.startsWith("/") ? path : `/${path}`}`;
  const withAuth = (access: string | null) =>
    fetch(url, {
      ...init,
      method: init?.method ?? "PATCH",
      body: formData,
      headers: {
        ...(access ? { Authorization: `Bearer ${access}` } : {}),
        ...init?.headers,
      },
    });

  const token = getAccessToken();
  let res = await withAuth(token);
  if (res.status === 401 && getRefreshToken()) {
    const newAccess = await refreshAccessToken();
    if (newAccess) res = await withAuth(newAccess);
  }
  return res;
}
