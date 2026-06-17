"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { patchOutreach } from "@/lib/api";
import { LEAD_STATUS_META } from "@/lib/outreach";
import { useProfiles } from "@/lib/profiles";
import { useLeads } from "@/lib/store";
import { useToast } from "@/components/Toast";
import type { Outreach } from "@/lib/types";

const GROUPS = [
  { key: "ready_to_send", title: "Ready to send" },
  { key: "sent", title: "Sent" },
  { key: "replied", title: "Replied" },
] as const;

export default function OutreachPage() {
  const { activeProfile } = useProfiles();
  const { state, dispatch } = useLeads();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const grouped = useMemo(
    () =>
      GROUPS.map((group) => ({
        ...group,
        rows: state.outreach.filter((row) => row.status === group.key),
      })),
    [state.outreach]
  );

  async function markSent(row: Outreach) {
    try {
      const sentAt = new Date().toISOString();
      const next = await patchOutreach(row.id, {
        status: "sent",
        sent_at: sentAt,
        lead_id: row.lead_id,
        lead_status: "sent",
        profile_id: row.profile_id,
      });
      dispatch({
        type: "UPDATE_OUTREACH",
        outreach: { ...row, ...next, sent_at: sentAt, status: "sent" },
        leadStatus: "sent",
      });
      toast("Marked sent", "success");
    } catch {
      toast("Failed to update outreach", "error");
    }
  }

  async function markReplied(row: Outreach, interested = false) {
    const snippet = window.prompt("Reply snippet")?.trim();
    if (!snippet) return;
    try {
      const repliedAt = new Date().toISOString();
      const next = await patchOutreach(row.id, {
        status: "replied",
        reply_snippet: snippet,
        replied_at: repliedAt,
        lead_id: row.lead_id,
        lead_status: interested ? "interested" : "replied",
        profile_id: row.profile_id,
      });
      dispatch({
        type: "UPDATE_OUTREACH",
        outreach: {
          ...row,
          ...next,
          reply_snippet: snippet,
          replied_at: repliedAt,
          status: "replied",
        },
        leadStatus: interested ? "interested" : "replied",
      });
      toast(interested ? "Marked interested" : "Marked replied", "success");
    } catch {
      toast("Failed to update outreach", "error");
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <code className="mono-label block mb-2">outreach</code>
        <h1 className="text-3xl sm:text-4xl font-light text-text-primary tracking-tight" style={{ lineHeight: "1.1" }}>
          Outreach Queue
        </h1>
        <p className="text-text-muted text-sm mt-2">
          Prepared messages for {activeProfile.name}.
        </p>
        <div className="mt-3 inline-flex items-start gap-2 rounded-lg border border-yellow/30 bg-yellow/5 px-3 py-2 text-xs text-text-secondary">
          <span className="text-yellow">●</span>
          <span>
            This system never sends. Copy a message, send it yourself on LinkedIn or email,
            then click <span className="text-text-primary font-medium">I sent this</span> to log it.
          </span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {grouped.map((group, index) => (
          <motion.section key={group.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="border border-border rounded-xl bg-surface p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-text-primary">{group.title}</h2>
              <span className="text-[10px] font-mono text-text-dim">{group.rows.length}</span>
            </div>

            <div className="space-y-3">
              {group.rows.map((row) => {
                const lead = state.leads.find((item) => item.id === row.lead_id) || row.lead;
                const meta = lead ? LEAD_STATUS_META[lead.status] : LEAD_STATUS_META.new;
                const timeline = state.outreach.filter((item) => item.lead_id === row.lead_id);
                return (
                  <article key={String(row.id)} className="border border-border rounded-lg p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary">{lead?.name || `Lead #${row.lead_id}`}</p>
                        <p className="text-xs text-text-muted mt-0.5">
                          {lead?.company || "Unknown company"} · {row.channel}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium" style={{ color: meta.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
                        {meta.label}
                      </span>
                    </div>

                    <button type="button" onClick={() => setExpanded((current) => ({ ...current, [String(row.id)]: !current[String(row.id)] }))} className="mt-3 text-xs text-green-link hover:text-green">
                      {expanded[String(row.id)] ? "Hide prepared message" : "Show prepared message"}
                    </button>

                    {expanded[String(row.id)] ? (
                      <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-black/20 border border-border p-3 text-xs text-text-secondary font-mono">
                        {row.message_body}
                      </pre>
                    ) : null}

                    <div className="mt-3 text-[10px] font-mono text-text-dim">
                      Prepared: {new Date(row.prepared_at).toLocaleString()}
                    </div>

                    {row.reply_snippet ? (
                      <div className="mt-3 rounded-lg border border-green-border bg-green/5 p-3">
                        <p className="text-[10px] font-mono text-green uppercase tracking-wider mb-1">Reply snippet</p>
                        <p className="text-xs text-text-secondary">{row.reply_snippet}</p>
                      </div>
                    ) : null}

                    {row.status !== "replied" ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {row.status === "ready_to_send" ? (
                          <button type="button" onClick={() => markSent(row)} title="Logs that you already sent this manually. Does not send anything." className="px-3 py-1.5 rounded-md border border-green-border text-xs text-green">
                            I sent this
                          </button>
                        ) : null}
                        <button type="button" onClick={() => markReplied(row, false)} className="px-3 py-1.5 rounded-md border border-border text-xs text-text-secondary">
                          Mark replied
                        </button>
                        <button type="button" onClick={() => markReplied(row, true)} className="px-3 py-1.5 rounded-md bg-green text-black text-xs font-medium">
                          Mark interested
                        </button>
                      </div>
                    ) : null}

                    <div className="mt-4 border-t border-border pt-3">
                      <p className="text-[10px] font-mono text-text-dim uppercase tracking-wider mb-2">Per-lead activity</p>
                      <div className="space-y-2">
                        {timeline.map((item) => (
                          <div key={String(item.id)} className="flex items-center justify-between gap-3 text-xs">
                            <span className="text-text-secondary">{item.channel} · {item.status}</span>
                            <span className="font-mono text-text-dim">{new Date(item.prepared_at).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </motion.section>
        ))}
      </div>
    </div>
  );
}
