"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useLeads } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { useProfiles } from "@/lib/profiles";

const NAV = [
  { href: "/overview", label: "Overview" },
  { href: "/leads", label: "Leads" },
  { href: "/outreach", label: "Outreach" },
  { href: "/profiles", label: "Profiles" },
  { href: "/timeline", label: "Timeline" },
  { href: "/categories", label: "Categories" },
  { href: "/archive", label: "Archive" },
  { href: "/search", label: "Search" },
  { href: "/settings", label: "Settings" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useLeads();
  const { theme, toggle } = useTheme();
  const { profiles, activeProfile, switchProfile } = useProfiles();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const newCount = state.leads.filter((lead) => lead.status === "new").length;
  const queueCount = state.outreach.filter((row) => row.status === "ready_to_send").length;

  function handleProfileChange(value: string) {
    if (value === "__new__") {
      router.push("/profiles");
      setSidebarOpen(false);
      return;
    }
    switchProfile(value);
  }

  return (
    <div className="min-h-screen flex" data-theme={theme}>
      <aside className="hidden lg:flex flex-col w-[240px] border-r border-border bg-surface fixed h-full z-40">
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border">
          <span className="w-7 h-7 rounded-md bg-green flex items-center justify-center text-black text-xs font-bold">U</span>
          <div>
            <p className="text-sm font-medium text-text-primary leading-none">unreal.ae</p>
            <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider mt-0.5">
              Lead Command Center
            </p>
          </div>
        </div>

        <div className="px-3 pt-4">
          <p className="px-1 mb-2 text-[10px] font-mono text-text-dim uppercase tracking-wider">Active profile</p>
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeProfile.accent_color }} />
            <span className="text-sm text-text-primary truncate">{activeProfile.name}</span>
          </div>
          <select
            value={String(activeProfile.id)}
            onChange={(event) => handleProfileChange(event.target.value)}
            className="w-full h-10 rounded-md bg-black/20 border border-border px-3 text-sm text-text-secondary"
          >
            {profiles.map((profile) => (
              <option key={String(profile.id)} value={String(profile.id)}>
                {profile.name}
              </option>
            ))}
            <option value="__new__">+ New profile</option>
          </select>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <p className="px-2 mb-2 text-[10px] font-mono text-text-dim uppercase tracking-wider">Navigation</p>
          {NAV.map((item) => {
            const active = pathname === item.href || (pathname === "/" && item.href === "/overview");
            const badge =
              item.href === "/leads"
                ? newCount
                : item.href === "/outreach"
                  ? queueCount
                  : 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm mb-0.5 transition-all ${
                  active
                    ? "bg-green-bg text-green border border-green-border"
                    : "text-text-muted hover:text-text-primary hover:bg-surface-hover border border-transparent"
                }`}
              >
                <span>{item.label}</span>
                {badge > 0 ? (
                  <span className="ml-auto text-[10px] font-mono bg-green text-black px-1.5 py-0.5 rounded-full">
                    {badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-border space-y-2">
          <button
            onClick={toggle}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-text-muted hover:text-text-primary hover:bg-surface-hover border border-transparent transition-all"
          >
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>
          <div className="text-[10px] font-mono text-text-dim px-2">
            Scanner: profile queries. Outreach: dry-run only.
          </div>
        </div>
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-page/95 backdrop-blur-md border-b border-border z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-md bg-green flex items-center justify-center text-black text-xs font-bold">U</span>
          <span className="text-sm font-medium text-text-primary truncate max-w-[180px]">{activeProfile.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggle} className="p-1.5 rounded-md border border-border text-text-muted hover:text-text-primary transition-all">
            {theme === "dark" ? "L" : "D"}
          </button>
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-md border border-border text-text-muted hover:text-text-primary transition-all" aria-label="Open menu">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {sidebarOpen ? (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 lg:hidden" onClick={() => setSidebarOpen(false)} />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-0 left-0 h-full w-[280px] bg-surface border-r border-border z-[60] flex flex-col lg:hidden"
            >
              <div className="h-14 flex items-center justify-between px-4 border-b border-border">
                <span className="text-sm font-medium text-text-primary">Campaigns</span>
                <button onClick={() => setSidebarOpen(false)} className="p-1 text-text-muted">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="px-4 py-4 border-b border-border">
                <select
                  value={String(activeProfile.id)}
                  onChange={(event) => handleProfileChange(event.target.value)}
                  className="w-full h-10 rounded-md bg-black/20 border border-border px-3 text-sm text-text-secondary"
                >
                  {profiles.map((profile) => (
                    <option key={String(profile.id)} value={String(profile.id)}>
                      {profile.name}
                    </option>
                  ))}
                  <option value="__new__">+ New profile</option>
                </select>
              </div>
              <nav className="flex-1 overflow-y-auto py-3 px-2">
                {NAV.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-2.5 px-2.5 py-2.5 rounded-md text-sm mb-0.5 transition-all ${
                        active
                          ? "bg-green-bg text-green border border-green-border"
                          : "text-text-muted hover:text-text-primary border border-transparent"
                      }`}
                    >
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/95 backdrop-blur-md border-t border-border z-40 flex items-center justify-around px-2">
        {[
          { href: "/overview", label: "Overview" },
          { href: "/leads", label: "Leads" },
          { href: "/outreach", label: "Outreach" },
          { href: "/profiles", label: "Profiles" },
          { href: "/timeline", label: "Timeline" },
        ].map((item) => {
          const active = pathname === item.href || (pathname === "/" && item.href === "/overview");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md transition-all ${
                active ? "text-green" : "text-text-dim hover:text-text-muted"
              }`}
            >
              <span className="text-[9px] font-mono uppercase tracking-wider leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="flex-1 lg:ml-[240px] flex flex-col min-h-screen">
        <main className="flex-1 pt-14 lg:pt-0 pb-20 lg:pb-0">{children}</main>
      </div>
    </div>
  );
}
