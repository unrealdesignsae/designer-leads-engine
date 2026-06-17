"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { sendOutreach, patchOutreach, updateLead } from "@/lib/api";
import { LEAD_STATUS_META } from "@/lib/outreach";
import { useProfiles } from "@/lib/profiles";
import { useLeads } from "@/lib/store";
import { useToast } from "@/components/Toast";
import type { Lead, Outreach, OutreachChannel } from "@/lib/types";

const CHANNELS: { key: OutreachChannel; label: string; icon: string }[] = [
  { key: "linkedin", label: "LinkedIn", icon: "in" },
  { key: "email", label: "Email", icon: "@" },
  { key: "whatsapp", label: "WhatsApp", icon: "WA" },
  { key: "instagram", label: "Instagram", icon: "IG" },
];

interface LeadGroup {
  leadId: number;
  lead: Lead;
  rows: Outreach[];
  channels: { channel: OutreachChannel; row: Outreach }[];
  status: Outreach["status"];
  repliedRow?: Outreach;
}

const STATUS_COLUMNS = [
  { key: "ready_to_send" as const, title: "Ready to send" },
  { key: "sent" as const, title: "Sent" },
  { key: "replied" as const, title: "Replied" },
];

export default function OutreachPage() {
  const { activeProfile } = useProfiles();
  const { state, dispatch } = useLeads();
  const { toast } = useToast();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const groupedByLead: LeadGroup[] = useMemo(() => {
    const map = new Map<number, Outreach[]>();
    for (const row of state.outreach) {
      const rows = map.get(row.lead_id) || [];
      rows.push(row);
      map.set(row.lead_id, rows);
    }

    return Array.from(map.entries())
      .map(([leadId, rows]) => {
        const lead = state.leads.find((l) => l.id === leadId) || (rows[0]?.lead ?? null);
        if (!lead || lead.status === "archived") return null;
        const visibleRows = rows.filter((r) => r.status !== "skipped");
        if (visibleRows.length === 0) return null;

        const statuses = visibleRows.map((r) => r.status);
        const hasReplied = statuses.includes("replied");
        const hasSent = statuses.includes("sent");
        const repliedRow = rows.find((r) => r.status === "replied");

        const activeRows = visibleRows.filter((r) => r.status !== "sent" && r.status !== "replied");
        const channels = activeRows.map((r) => ({
          channel: r.channel as OutreachChannel,
          row: r,
        }));

        return {
          leadId,
          lead,
          rows,
          channels,
          status: hasReplied ? "replied" : hasSent ? "sent" : "ready_to_send",
          repliedRow,
        } as LeadGroup;
      })
      .filter(Boolean) as LeadGroup[];
  }, [state.outreach, state.leads]);

  const toggleChannel = (leadId: number, channel: string) => {
    const key = `${leadId}-${channel}`;
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAll = (group: LeadGroup) => {
    const updates: Record<string, boolean> = {};
    for (const ch of group.channels) {
      updates[`${group.leadId}-${ch.channel}`] = true;
    }
    setChecked((prev) => ({ ...prev, ...updates }));
  };

  const selectedForLead = (group: LeadGroup) =>
    group.channels.filter((ch) => checked[`${group.leadId}-${ch.channel}`]);

  async function sendSelected(group: LeadGroup) {
    const selected = selectedForLead(group);
    if (selected.length === 0) { toast("Select at least one channel", "error"); return; }
    const who = group.lead.name || `Lead #${group.leadId}`;
    const channelList = selected.map((s) => s.channel).join(" + ");
    if (!window.confirm(`Send ${channelList} to ${who}?`)) return;

    const key = String(group.leadId);
    setSending((prev) => ({ ...prev, [key]: true }));
    let sent = 0; let failed = 0;
    for (const ch of selected) {
      try {
        const result = await sendOutreach(ch.row.id);
        if (result.ok) {
          const sentAt = result.sent_at || new Date().toISOString();
          dispatch({ type: "UPDATE_OUTREACH", outreach: { ...ch.row, ...(result.outreach || {}), sent_at: sentAt, status: "sent" }, leadStatus: "sent" });
          sent++;
        } else { toast(`${ch.channel}: ${result.error || "Failed"}`, "error"); failed++; }
      } catch { toast(`${ch.channel}: request failed`, "error"); failed++; }
    }
    setSending((prev) => ({ ...prev, [key]: false }));
    const msg = failed === 0 ? `Sent ${sent} to ${who}` : `Sent ${sent}, ${failed} failed`;
    toast(msg, sent > 0 ? "success" : "error");
    const updates: Record<string, boolean> = {};
    for (const ch of selected) updates[`${group.leadId}-${ch.channel}`] = false;
    setChecked((prev) => ({ ...prev, ...updates }));
  }

  async function markReplied(group: LeadGroup, interested = false) {
    const snippet = window.prompt("Reply snippet")?.trim();
    if (!snippet) return;
    let updated = 0;
    for (const row of group.rows) {
      if (row.status !== "replied") {
        try {
          const repliedAt = new Date().toISOString();
          const next = await patchOutreach(row.id, { status: "replied", reply_snippet: snippet, replied_at: repliedAt, lead_id: row.lead_id, lead_status: interested ? "interested" : "replied", profile_id: row.profile_id });
          dispatch({ type: "UPDATE_OUTREACH", outreach: { ...row, ...next, reply_snippet: snippet, replied_at: repliedAt, status: "replied" }, leadStatus: interested ? "interested" : "replied" });
          updated++;
        } catch { /* skip */ }
      }
    }
    if (updated) toast(interested ? "Marked interested" : "Marked replied", "success");
  }

  async function archiveLead(group: LeadGroup) {
    if (!window.confirm(`Archive ${group.lead.name}?`)) return;
    try {
      const updated = await updateLead(group.leadId, { status: "archived" });
      dispatch({ type: "UPDATE_LEAD", lead: updated });
      for (const row of group.rows) {
        if (row.status !== "sent" && row.status !== "replied") {
          const next = await patchOutreach(row.id, { status: "skipped" });
          dispatch({ type: "UPDATE_OUTREACH", outreach: { ...row, ...next, status: "skipped" } });
        }
      }
      toast(`${group.lead.name} archived`, "success");
    } catch { toast("Failed to archive", "error"); }
  }

  async function removeCard(group: LeadGroup) {
    if (!window.confirm(`Remove ${group.lead.name} from outreach?`)) return;
    try {
      for (const row of group.rows) {
        if (row.status !== "sent" && row.status !== "replied") {
          const next = await patchOutreach(row.id, { status: "skipped" });
          dispatch({ type: "UPDATE_OUTREACH", outreach: { ...row, ...next, status: "skipped" } });
        }
      }
      toast(`${group.lead.name} removed`, "success");
    } catch { toast("Failed to remove", "error"); }
  }

  const grouped = STATUS_COLUMNS.map((col) => ({
    ...col,
    groups: groupedByLead.filter((g) => g.status === col.key),
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <code className="mono-label block mb-2">outreach</code>
        <h1 className="text-3xl sm:text-4xl font-light text-text-primary tracking-tight" style={{ lineHeight: "1.1" }}>Outreach Queue</h1>
        <p className="text-text-muted text-sm mt-2">Prepared messages for {activeProfile.name}. Check channels, then send.</p>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {grouped.map((col, colIdx) => (
          <motion.section key={col.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: colIdx * 0.05 }} className="border border-border rounded-xl bg-surface p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-text-primary">{col.title}</h2>
              <span className="text-[10px] font-mono text-text-dim">{col.groups.length}</span>
            </div>
            <div className="space-y-3">
              {col.groups.map((group) => {
                const meta = LEAD_STATUS_META[group.lead.status] || LEAD_STATUS_META.new;
                const selected = selectedForLead(group);
                const timeline = state.outreach.filter((item) => item.lead_id === group.leadId);

                return (
                  <article key={String(group.leadId)} className="border border-border rounded-lg bg-black/10 p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-primary leading-tight">{group.lead.name}</p>
                        <p className="text-xs text-text-muted mt-0.5">{group.lead.company || "Unknown"} · {group.lead.role_seeking || group.lead.title}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium shrink-0" style={{ color: meta.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.color }} />{meta.label}
                      </span>
                    </div>

                    {/* Channel checkboxes */}
                    {col.key === "ready_to_send" && group.channels.length > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center gap-1 mb-1.5">
                          <button type="button" onClick={() => selectAll(group)} className="text-[10px] text-green-link hover:text-green font-medium">Select all</button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {CHANNELS.filter((ch) => group.channels.some((gch) => gch.channel === ch.key)).map((ch) => {
                            const chKey = `${group.leadId}-${ch.key}`;
                            const isChecked = !!checked[chKey];
                            const row = group.channels.find((gch) => gch.channel === ch.key)?.row;
                            return (
                              <label key={chKey} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] cursor-pointer transition-colors ${isChecked ? "border-green-border bg-green/15 text-green" : "border-border/60 text-text-muted hover:border-green-border/40"}`}>
                                <input type="checkbox" checked={isChecked} onChange={() => toggleChannel(group.leadId, ch.key)} className="sr-only" />
                                <span className="font-mono text-[10px] font-bold opacity-60">{ch.icon}</span>
                                <span>{ch.label}</span>
                                {row && (
                                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded((p) => ({ ...p, [chKey]: !p[chKey] })); }} className="ml-0.5 text-[10px] text-text-dim hover:text-text-secondary">
                                    {expanded[chKey] ? "▲" : "▼"}
                                  </button>
                                )}
                              </label>
                            );
                          })}
                        </div>
                        {CHANNELS.filter((ch) => group.channels.some((gch) => gch.channel === ch.key)).map((ch) => {
                          const chKey = `${group.leadId}-${ch.key}`;
                          const row = group.channels.find((gch) => gch.channel === ch.key)?.row;
                          if (!expanded[chKey] || !row) return null;
                          return (
                            <pre key={`msg-${chKey}`} className="mt-1.5 whitespace-pre-wrap rounded-md bg-black/30 border border-border/40 p-2 text-[11px] text-text-secondary font-mono max-h-28 overflow-y-auto leading-relaxed">{row.message_body}</pre>
                          );
                        })}
                      </div>
                    )}

                    {/* Sent badges */}
                    {col.key === "sent" && (
                      <div className="mb-3 flex flex-wrap gap-1">
                        {group.rows.filter((r) => r.status === "sent").map((r) => (
                          <span key={String(r.id)} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-purple/15 border border-purple-border/30 text-purple/80">
                            {r.channel} · {r.sent_at ? new Date(r.sent_at).toLocaleDateString() : "sent"}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Replied snippet */}
                    {group.repliedRow?.reply_snippet && (
                      <div className="mb-3 rounded-md border border-green-border/50 bg-green/5 p-2.5">
                        <p className="text-[10px] font-mono text-green/70 uppercase tracking-wider mb-1">Reply</p>
                        <p className="text-xs text-text-secondary leading-relaxed">{group.repliedRow.reply_snippet}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-1.5">
                      {col.key === "ready_to_send" && group.channels.length > 0 && (
                        <button type="button" onClick={() => sendSelected(group)} disabled={sending[String(group.leadId)] || selected.length === 0}
                          className="px-3 py-1.5 rounded-md bg-green text-black text-[11px] font-semibold disabled:opacity-30 transition-opacity">
                          {sending[String(group.leadId)] ? "Sending…" : selected.length > 0 ? `Send (${selected.length})` : "Send"}
                        </button>
                      )}
                      {col.key === "ready_to_send" && (
                        <>
                          <button type="button" onClick={() => markReplied(group, false)} className="px-2.5 py-1.5 rounded-md border border-border/60 text-[11px] text-text-secondary hover:border-border">Mark replied</button>
                          <button type="button" onClick={() => markReplied(group, true)} className="px-2.5 py-1.5 rounded-md bg-green/10 border border-green-border/30 text-[11px] text-green">Mark interested</button>
                        </>
                      )}
                      {group.lead.post_url && (
                        <a href={group.lead.post_url} target="_blank" rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-md border border-border/60 text-[11px] text-text-muted hover:text-text-secondary inline-flex items-center gap-1 no-underline">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                          View source
                        </a>
                      )}
                      <button type="button" onClick={() => removeCard(group)} className="px-2.5 py-1.5 rounded-md border border-border/60 text-[11px] text-text-muted hover:text-text-secondary">Remove</button>
                      <button type="button" onClick={() => archiveLead(group)} className="px-2.5 py-1.5 rounded-md border border-crimson/30 text-[11px] text-crimson/80 hover:bg-crimson/5">Archive</button>
                    </div>

                    {/* Timeline */}
                    <div className="mt-3 pt-3 border-t border-border/40">
                      <p className="text-[10px] font-mono text-text-dim/60 uppercase tracking-wider mb-1.5">Activity</p>
                      <div className="space-y-1">
                        {timeline.slice(0, 4).map((item) => (
                          <div key={String(item.id)} className="flex items-center justify-between gap-2 text-[10px]">
                            <span className="text-text-muted">
                              <span className="font-mono mr-1">{item.channel === "linkedin" ? "in" : item.channel === "whatsapp" ? "WA" : item.channel === "instagram" ? "IG" : "@"}</span>
                              {item.status === "ready_to_send" ? "prepared" : item.status === "queued" ? "queued" : item.status}
                            </span>
                            <span className="font-mono text-text-dim/60">{new Date(item.prepared_at).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })}
              {col.groups.length === 0 && <p className="text-xs text-text-dim py-8 text-center">Nothing here yet.</p>}
            </div>
          </motion.section>
        ))}
      </div>
    </div>
  );
}
