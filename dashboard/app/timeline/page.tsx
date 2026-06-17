"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { LEAD_STATUS_META } from "@/lib/outreach";
import { useLeads } from "@/lib/store";
import type { Lead } from "@/lib/types";

function getBucket(lead: Lead): string {
  const days = Math.floor((Date.now() - new Date(lead.post_date || lead.discovered_at).getTime()) / 86400000);
  if (days <= 7) return "This week";
  if (days <= 14) return "Last 2 weeks";
  if (days <= 30) return "This month";
  if (days <= 60) return "Last 2 months";
  return "Older";
}

const BUCKET_ORDER = ["This week", "Last 2 weeks", "This month", "Last 2 months", "Older"];

export default function TimelinePage() {
  const { state } = useLeads();

  const groups = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    state.leads.forEach((lead) => {
      const bucket = getBucket(lead);
      if (!map[bucket]) map[bucket] = [];
      map[bucket].push(lead);
    });
    return BUCKET_ORDER.filter((bucket) => map[bucket]?.length).map((bucket) => ({
      bucket,
      leads: map[bucket].sort((a, b) => new Date(b.post_date).getTime() - new Date(a.post_date).getTime()),
    }));
  }, [state.leads]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <code className="mono-label block mb-2">timeline</code>
        <h1 className="text-3xl sm:text-4xl font-light text-text-primary tracking-tight" style={{ lineHeight: "1.1" }}>
          Posting Timeline
        </h1>
      </motion.div>

      <div className="space-y-10">
        {groups.map(({ bucket, leads }, groupIndex) => (
          <motion.div key={bucket} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: groupIndex * 0.07 }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-green" />
              <h2 className="text-sm font-medium text-text-primary">{bucket}</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm border border-border text-text-dim">{leads.length} leads</span>
            </div>

            <div className="ml-5 border-l border-border pl-5 space-y-3">
              {leads.map((lead, index) => {
                const meta = LEAD_STATUS_META[lead.status] || LEAD_STATUS_META.new;
                return (
                  <motion.div key={lead.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: groupIndex * 0.07 + index * 0.03 }} className="relative border border-border rounded-lg bg-surface p-4">
                    <span className="absolute -left-[25px] top-4 w-2 h-2 rounded-full bg-border border-2 border-page" />
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-text-primary">{lead.name}</p>
                          <span className="text-[10px] font-mono text-text-dim">{lead.post_date}</span>
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">{lead.company} · {lead.location}</p>
                        <p className="text-xs text-text-secondary mt-1">{lead.role_seeking}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: meta.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
                        {meta.label}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
