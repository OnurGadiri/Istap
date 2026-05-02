import { DashboardGate } from "@/components/DashboardGate";

export default function CompanyDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardGate allowedRoles={["company"]}>{children}</DashboardGate>;
}
