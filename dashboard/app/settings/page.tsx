"use client";

import { motion } from "framer-motion";
import { useTheme } from "@/lib/theme";

export default function SettingsPage() {
  const { theme, toggle } = useTheme();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <code className="mono-label block mb-2">settings</code>
        <h1 className="text-3xl sm:text-4xl font-light text-text-primary tracking-tight" style={{ lineHeight: "1.1" }}>
          Settings
        </h1>
      </motion.div>

      <div className="space-y-8">
        <section>
          <h2 className="text-xs font-mono text-text-muted uppercase tracking-wider border-b border-border pb-2 mb-4">Appearance</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-primary">Theme</p>
              <p className="text-xs text-text-muted mt-0.5">Current: {theme === "dark" ? "Dark mode" : "Light mode"}</p>
            </div>
            <button onClick={toggle} className="px-4 py-2 rounded-md bg-surface border border-border text-sm text-text-secondary">
              {theme === "dark" ? "Switch to Light" : "Switch to Dark"}
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-mono text-text-muted uppercase tracking-wider border-b border-border pb-2 mb-4">Dispatch</h2>
          <div className="border border-green-border rounded-xl bg-green/5 p-4">
            <p className="text-sm text-text-primary">Dry-run is enforced by default.</p>
            <p className="text-xs text-text-muted mt-1">
              TypeScript uses <code>DISPATCH_LIVE !== &quot;true&quot;</code>. Python uses <code>DRY_RUN = True</code>.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
