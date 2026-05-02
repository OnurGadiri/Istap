import { DashboardGate } from "@/components/DashboardGate";

export default function RecruiterDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardGate allowedRoles={["recruiter"]}>{children}</DashboardGate>;
}
