"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LEAD_STATUS_META } from "@/lib/outreach";
import { useLeads } from "@/lib/store";

export default function SearchPage() {
  const { state } = useLeads();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return state.leads.filter((lead) => {
      const haystack = [lead.name, lead.company, lead.role_seeking, lead.location, lead.source, lead.notes || ""].join(" ").toLowerCase();
      return normalized ? haystack.includes(normalized) : true;
    });
  }, [query, state.leads]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <code className="mono-label block mb-2">search</code>
        <h1 className="text-3xl sm:text-4xl font-light text-text-primary tracking-tight" style={{ lineHeight: "1.1" }}>
          Search
        </h1>
      </motion.div>

      <div className="mb-4">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, company, role, location, source, notes..." className="w-full h-12 px-4 rounded-lg bg-surface border border-border text-text-primary" />
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {results.map((lead, index) => {
            const meta = LEAD_STATUS_META[lead.status] || LEAD_STATUS_META.new;
            return (
              <motion.div key={lead.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15, delay: index * 0.02 }} className="border border-border rounded-lg bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-sm text-text-primary">{lead.name}</span>
                    <p className="text-xs text-text-muted mt-0.5">{lead.company} · {lead.location}</p>
                    <p className="text-xs text-text-secondary mt-1">{lead.role_seeking}</p>
                  </div>
                  <span className="text-[10px]" style={{ color: meta.color }}>{meta.label}</span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
