import { DashboardGate } from "@/components/DashboardGate";

export default function EmployerJobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardGate allowedRoles={["company", "recruiter", "admin"]}>
      {children}
    </DashboardGate>
  );
}
