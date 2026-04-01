import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { Raleway } from 'next/font/google';
import DashboardNav from "@/components/dashboard/DashboardNav";
import AuthGuard from '@/components/auth/AuthGuard';
const raleway = Raleway({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-raleway',
});

export const metadata: Metadata = {
  title: "InVision U | Dashboard",
  description: "Dashboard for hackathon Decentrathon 5.0",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col">
      <AuthGuard>
        <DashboardNav activeTab="orders">
          {children}
        </DashboardNav>
        </AuthGuard>
      </div>
  );
}
