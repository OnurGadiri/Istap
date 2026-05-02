import { DashboardGate } from "@/components/DashboardGate";

export default function JobSeekerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardGate allowedRoles={["job_seeker"]}>{children}</DashboardGate>;
}
