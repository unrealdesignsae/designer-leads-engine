"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { LEAD_STATUS_META } from "@/lib/outreach";
import { useLeads } from "@/lib/store";
import type { Lead } from "@/lib/types";

type Category = "type" | "location" | "source" | "freshness";

const ROLE_TYPES: Record<string, string[]> = {
  "3D Designer": ["3d designer", "3d artist", "cg artist", "cg generalist"],
  "Creative Director": ["creative director"],
  "Art Director": ["art director"],
  "Motion Designer": ["motion designer", "motion"],
  Animator: ["animator"],
  "Recruiter / Agency": [],
};

function classifyRole(lead: Lead): string {
  const role = (lead.role_seeking || "").toLowerCase();
  for (const [category, keywords] of Object.entries(ROLE_TYPES)) {
    if (keywords.some((keyword) => role.includes(keyword))) return category;
  }
  if ((lead.title || "").toLowerCase().includes("recruit") || (lead.company || "").toLowerCase().includes("recruitment")) return "Recruiter / Agency";
  return "Other";
}

function freshness(lead: Lead): string {
  const days = Math.floor((Date.now() - new Date(lead.post_date || lead.discovered_at).getTime()) / 86400000);
  if (days <= 14) return "Hot (last 2 weeks)";
  if (days <= 30) return "Warm (last month)";
  if (days <= 90) return "Cooling (last 3 months)";
  return "Cold (older)";
}

export default function CategoriesPage() {
  const { state } = useLeads();
  const [activeCategory, setActiveCategory] = useState<Category>("type");

  const grouped = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    state.leads.forEach((lead) => {
      const key =
        activeCategory === "type"
          ? classifyRole(lead)
          : activeCategory === "location"
            ? lead.location || "Unknown"
            : activeCategory === "source"
              ? lead.source || "Unknown"
              : freshness(lead);
      if (!map[key]) map[key] = [];
      map[key].push(lead);
    });
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, [activeCategory, state.leads]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <code className="mono-label block mb-2">categories</code>
        <h1 className="text-3xl sm:text-4xl font-light text-text-primary tracking-tight" style={{ lineHeight: "1.1" }}>
          Lead Categories
        </h1>
      </motion.div>

      <div className="flex flex-wrap gap-1.5 mb-6 border-b border-border pb-4">
        {[
          { key: "type", label: "By Role Type" },
          { key: "location", label: "By Location" },
          { key: "source", label: "By Source" },
          { key: "freshness", label: "By Freshness" },
        ].map((tab) => (
          <button key={tab.key} onClick={() => setActiveCategory(tab.key as Category)} className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${activeCategory === tab.key ? "bg-green-bg text-green border-green-border" : "text-text-muted border-border hover:text-text-primary"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {grouped.map(([groupName, leads], groupIndex) => (
          <motion.div key={groupName} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: groupIndex * 0.05 }}>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-sm font-medium text-text-primary">{groupName}</h2>
              <span className="text-xs font-mono text-text-dim bg-surface border border-border px-2 py-0.5 rounded-sm">{leads.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {leads.map((lead) => {
                const meta = LEAD_STATUS_META[lead.status] || LEAD_STATUS_META.new;
                return (
                  <div key={lead.id} className="border border-border rounded-lg bg-surface p-3">
                    <p className="text-sm font-medium text-text-primary truncate">{lead.name}</p>
                    <p className="text-xs text-text-muted mt-0.5 truncate">{lead.company}</p>
                    <p className="text-xs text-text-secondary mt-1 line-clamp-2">{lead.role_seeking}</p>
                    <div className="mt-2 pt-2 border-t border-border-subtle flex items-center justify-between">
                      <span className="text-[10px] font-mono text-text-dim">{lead.post_date}</span>
                      <span className="text-[10px]" style={{ color: meta.color }}>{meta.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
