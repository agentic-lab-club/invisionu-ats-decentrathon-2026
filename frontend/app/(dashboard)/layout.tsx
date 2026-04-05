import type { Metadata } from "next";
import "../globals.css";
import DashboardNav from "@/components/dashboard/DashboardNav";
import AuthGuard from '@/components/auth/AuthGuard';

export const metadata: Metadata = {
  title: "InVision U | Dashboard",
  description: "Dashboard for hackathon Decentrathon 5.0",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col">
      <AuthGuard requireDashboardRole>
        <DashboardNav>
          {children}
        </DashboardNav>
      </AuthGuard>
    </div>
  );
}
