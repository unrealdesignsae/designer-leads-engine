"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { LEAD_STATUS_META } from "@/lib/outreach";
import { useLeads } from "@/lib/store";
import type { Lead } from "@/lib/types";

const ARCHIVED_STATUSES: Lead["status"][] = ["sent", "replied", "interested", "declined", "failed"];

export default function ArchivePage() {
  const { state } = useLeads();
  const archived = useMemo(
    () =>
      state.leads.filter((lead) => ARCHIVED_STATUSES.includes(lead.status)),
    [state.leads]
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <code className="mono-label block mb-2">archive</code>
        <h1 className="text-3xl sm:text-4xl font-light text-text-primary tracking-tight" style={{ lineHeight: "1.1" }}>
          Archive
        </h1>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {archived.map((lead) => {
          const meta = LEAD_STATUS_META[lead.status] || LEAD_STATUS_META.new;
          return (
            <div key={lead.id} className="border border-border rounded-lg bg-surface p-3">
              <p className="text-sm font-medium text-text-primary">{lead.name}</p>
              <p className="text-xs text-text-muted mt-0.5">{lead.company}</p>
              <p className="text-xs text-text-secondary mt-1 line-clamp-2">{lead.role_seeking}</p>
              <div className="mt-2 pt-2 border-t border-border-subtle flex items-center justify-between text-[10px] font-mono">
                <span className="text-text-dim">{lead.post_date}</span>
                <span style={{ color: meta.color }}>{meta.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
