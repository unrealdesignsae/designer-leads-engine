import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";
import { ProfilesProvider } from "@/lib/profiles";
import { LeadsProvider } from "@/lib/store";
import { ToastProvider } from "@/components/Toast";
import Shell from "@/components/Shell";

export const metadata: Metadata = {
  title: "Lead Command Center - unreal.ae",
  description:
    "Multi-profile lead command center for scanning, qualifying, and preparing outreach.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-page text-text-primary font-sans">
        <ThemeProvider>
          <ProfilesProvider>
            <LeadsProvider>
              <ToastProvider>
                <Shell>{children}</Shell>
              </ToastProvider>
            </LeadsProvider>
          </ProfilesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
