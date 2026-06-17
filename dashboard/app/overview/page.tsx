"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import StatsCard from "@/components/StatsCard";
import OverviewCharts from "@/components/OverviewCharts";
import { Skeleton } from "@/components/Skeleton";
import ScanModal from "@/components/ScanModal";
import { useLeads } from "@/lib/store";
import { useProfiles } from "@/lib/profiles";

export default function OverviewPage() {
  const { state } = useLeads();
  const { activeProfile } = useProfiles();
  const [scanOpen, setScanOpen] = useState(false);

  const newCount = state.leads.filter((lead) => lead.status === "new").length;
  const queuedCount = state.leads.filter((lead) => lead.status === "ready_to_send" || lead.status === "queued").length;
  const replyCount = state.leads.filter((lead) => lead.status === "replied" || lead.status === "interested").length;
  const reachableCount = state.leads.filter((lead) => lead.contact_email || lead.contact_linkedin || lead.contact_phone).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <code className="mono-label block mb-2">overview</code>
            <h1 className="text-3xl sm:text-4xl font-light text-text-primary tracking-tight" style={{ lineHeight: "1.1" }}>
              {activeProfile.name}
            </h1>
            <p className="text-text-muted text-sm mt-2 max-w-2xl">{activeProfile.description}</p>
          </div>
          <button
            type="button"
            onClick={() => setScanOpen(true)}
            className="shrink-0 mt-1 px-4 py-2 rounded-lg bg-green text-black text-xs font-medium hover:opacity-90 transition-opacity"
          >
            Run scan
          </button>
        </div>
      </motion.div>

      <ScanModal open={scanOpen} onClose={() => setScanOpen(false)} />

      <section className="mb-8">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {state.initialLoad ? (
            Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-lg" />)
          ) : (
            <>
              <StatsCard label="Total Leads" value={state.leads.length} unit="qualified" accent={activeProfile.accent_color} index={0} />
              <StatsCard label="New" value={newCount} unit="unworked" accent="var(--color-text-muted)" index={1} />
              <StatsCard label="Ready Queue" value={queuedCount} unit="prepared" accent="var(--color-blue)" index={2} />
              <StatsCard label="Replies" value={replyCount} unit="active" accent="var(--color-green)" index={3} />
              <StatsCard label="Reachable" value={reachableCount} unit="direct contact" accent="var(--color-yellow)" index={4} />
            </>
          )}
        </div>
      </section>

      {!state.initialLoad ? <OverviewCharts leads={state.leads} /> : null}
    </div>
  );
}
