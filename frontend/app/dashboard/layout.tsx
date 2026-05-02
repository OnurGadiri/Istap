import { DashboardNav } from "@/components/DashboardNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <DashboardNav />
      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">{children}</div>
    </div>
  );
}
