import { DashboardGate } from "@/components/DashboardGate";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardGate allowedRoles={["admin"]}>{children}</DashboardGate>;
}
