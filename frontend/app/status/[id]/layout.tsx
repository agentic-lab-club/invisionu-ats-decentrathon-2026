import "@/app/globals.css";
import Navbar from "@/components/ui/CandidateNavbar";


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
    <Navbar />
    {children}
    </>
  );
}