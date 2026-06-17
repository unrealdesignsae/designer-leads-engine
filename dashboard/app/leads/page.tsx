"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import LeadTable from "@/components/LeadTable";
import { SkeletonTable } from "@/components/Skeleton";
import { deleteLead, prepareOutreach, selectLeads, updateLead } from "@/lib/api";
import { useProfiles } from "@/lib/profiles";
import { useLeads } from "@/lib/store";
import { useToast } from "@/components/Toast";

const STATUS_STEPS = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "selected", label: "Selected" },
  { key: "ready_to_send", label: "Ready" },
  { key: "replied", label: "Replied" },
  { key: "interested", label: "Interested" },
  { key: "archived", label: "Archived" },
  { key: "failed", label: "Failed" },
];

export default function LeadsPage() {
  const router = useRouter();
  const { state, dispatch } = useLeads();
  const { activeProfile } = useProfiles();
  const { toast } = useToast();
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? state.leads : state.leads.filter((lead) => lead.status === filter);

  const handleSelect = useCallback(
    async (ids: number[]) => {
      if (!ids.length) return;
      dispatch({ type: "SELECT", ids });
      await selectLeads(ids).catch(() => {});
      toast(`${ids.length} lead${ids.length !== 1 ? "s" : ""} shortlisted`, "success");
    },
    [dispatch, toast]
  );

  const handlePrepare = useCallback(
    async (ids: number[]) => {
      if (!ids.length) return;
      dispatch({ type: "PREPARE_START" });
      try {
        const result = await prepareOutreach(ids, activeProfile.id);
        dispatch({
          type: "PREPARE_DONE",
          leadIds: result.leadIds,
          outreach: result.outreach,
        });
        toast(`${result.prepared} outreach item${result.prepared !== 1 ? "s" : ""} prepared`, "success");
        router.push("/outreach");
      } catch {
        dispatch({ type: "PREPARE_DONE", leadIds: ids, outreach: [] });
        toast("Failed to prepare outreach", "error");
      }
    },
    [activeProfile.id, dispatch, router, toast]
  );

  const handleArchive = useCallback(
    async (id: number) => {
      const lead = state.leads.find((item) => item.id === id);
      if (!lead) return;
      if (!window.confirm(`Archive ${lead.name}? It will stay in the database but leave the active pipeline.`)) return;
      try {
        const updated = await updateLead(id, { status: "archived" });
        dispatch({ type: "UPDATE_LEAD", lead: updated });
        toast(`${lead.name} archived`, "success");
      } catch {
        toast("Failed to archive lead", "error");
      }
    },
    [dispatch, state.leads, toast]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      const lead = state.leads.find((item) => item.id === id);
      if (!lead) return;
      if (!window.confirm(`Delete ${lead.name}? This removes the lead and its outreach rows from Supabase.`)) return;
      try {
        await deleteLead(id);
        dispatch({ type: "DELETE_LEAD", id });
        toast(`${lead.name} deleted`, "success");
      } catch {
        toast("Failed to delete lead", "error");
      }
    },
    [dispatch, state.leads, toast]
  );

  const handleRefresh = useCallback(() => {
    dispatch({ type: "SCAN_START" });
    toast("Scanner trigger is still external. Current seed data reloaded.", "info");
    setTimeout(() => {
      dispatch({
        type: "SCAN_DONE",
        scan: {
          id: Date.now(),
          profile_id: activeProfile.id,
          scan_date: new Date().toISOString().slice(0, 10),
          leads_found: state.leads.length,
          new_leads: state.leads.filter((lead) => lead.status === "new").length,
          dms_sent: 0,
          replies_received: 0,
          status: "completed",
        },
        leads: state.leads,
      });
    }, 800);
  }, [activeProfile.id, dispatch, state.leads, toast]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-6">
        <code className="mono-label block mb-2">leads</code>
        <h1 className="text-3xl sm:text-4xl font-light text-text-primary tracking-tight" style={{ lineHeight: "1.1" }}>
          {activeProfile.name}
        </h1>
        <p className="text-text-muted text-sm mt-2">{state.leads.length} leads in the active campaign.</p>
      </motion.div>

      <div className="flex flex-wrap gap-1.5 mb-6">
        {STATUS_STEPS.map((step) => {
          const count = step.key === "all" ? state.leads.length : state.leads.filter((lead) => lead.status === step.key).length;
          const active = filter === step.key;
          return (
            <button key={step.key} onClick={() => setFilter(step.key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${active ? "bg-green-bg text-green border-green-border" : "text-text-muted border-border hover:text-text-primary"}`}>
              {step.label}
              <span className="font-mono text-text-dim ml-0.5">{count}</span>
            </button>
          );
        })}
      </div>

      {state.initialLoad ? (
        <SkeletonTable />
      ) : (
        <LeadTable
          leads={filtered}
          onSelect={handleSelect}
          onPrepare={handlePrepare}
          onArchive={handleArchive}
          onDelete={handleDelete}
          onRefresh={handleRefresh}
          loading={state.loading}
          scanning={state.scanning}
        />
      )}
    </div>
  );
}
