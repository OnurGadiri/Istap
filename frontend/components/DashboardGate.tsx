"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

import { dashboardPathForRole } from "@/lib/auth-storage";
import { fetchSessionUser } from "@/lib/session";

export function DashboardGate({
  children,
  allowedRoles,
}: {
  children: ReactNode;
  allowedRoles: readonly string[];
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  const rolesKey = allowedRoles.join(",");

  useEffect(() => {
    let cancelled = false;
    void fetchSessionUser().then((u) => {
      if (cancelled) return;
      if (!u) {
        router.replace("/login");
        return;
      }
      if (!allowedRoles.includes(u.role)) {
        router.replace(dashboardPathForRole(u.role));
        return;
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [router, rolesKey]);

  if (!ready) {
    return (
      <p className="text-sm text-slate-500" aria-live="polite">
        Yüklənir…
      </p>
    );
  }
  return children;
}
