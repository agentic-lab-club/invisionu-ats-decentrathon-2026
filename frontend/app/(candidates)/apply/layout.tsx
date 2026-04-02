import type { Metadata } from "next";
import "@/app/globals.css";
import { Raleway } from 'next/font/google';
import Navbar from "@/components/ui/CandidateNavbar";
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
    <>
    <Navbar />
    {children}
    </>
  );
}