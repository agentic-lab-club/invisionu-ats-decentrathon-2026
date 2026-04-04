import type { Metadata } from "next";
import "@/app/globals.css";
import { Raleway } from 'next/font/google';
import { InterviewProvider } from './InterviewContext';

const raleway = Raleway({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-raleway',
});

export const metadata: Metadata = {
  title: "InVision U | AI Interview",
  description: "Stage 0 — AI-powered video interview for inVision University applicants",
};

export default function InterviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${raleway.variable} min-h-screen`} style={{ fontFamily: 'Raleway, sans-serif' }}>
      {/* InterviewProvider wraps BOTH /interview and /interview/session
          so the camera stream and TTS voices are warmed up on the intro page
          and instantly available in the session — no re-initialisation lag. */}
      <InterviewProvider>
        {children}
      </InterviewProvider>
    </div>
  );
}