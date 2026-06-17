"use client";

import { useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LeadDetail from "./LeadDetail";
import { LEAD_STATUS_META } from "@/lib/outreach";
import type { Lead } from "@/lib/types";

type SortMode = "rating" | "newest" | "name" | "company";

interface LeadTableProps {
  leads: Lead[];
  onSelect: (ids: number[]) => void;
  onPrepare: (ids: number[]) => void;
  onRefresh: () => void;
  loading: boolean;
  scanning: boolean;
}

export default function LeadTable({
  leads,
  onSelect,
  onPrepare,
  onRefresh,
  loading,
  scanning,
}: LeadTableProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("rating");

  const visibleLeads = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const searched = normalized
      ? leads.filter((lead) =>
          [
            lead.name,
            lead.company,
            lead.role_seeking,
            lead.location,
            lead.source,
            lead.notes || "",
            lead.contact_email || "",
            lead.contact_linkedin || "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalized)
        )
      : leads;

    return [...searched].sort((a, b) => {
      if (sort === "rating") {
        return (
          b.rating - a.rating ||
          new Date(b.post_date).getTime() - new Date(a.post_date).getTime()
        );
      }
      if (sort === "newest") return new Date(b.post_date).getTime() - new Date(a.post_date).getTime();
      if (sort === "name") return a.name.localeCompare(b.name);
      return a.company.localeCompare(b.company);
    });
  }, [leads, query, sort]);

  const actionable = useMemo(
    () => visibleLeads.filter((lead) => lead.status === "new" || lead.status === "selected"),
    [visibleLeads]
  );

  const toggle = useCallback((id: number) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    const ids = actionable.map((lead) => lead.id);
    const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
    setSelected(allSelected ? new Set() : new Set(ids));
  }, [actionable, selected]);

  const selectedIds = Array.from(selected);
  const allVisibleSelected = actionable.length > 0 && actionable.every((lead) => selected.has(lead.id));

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="border border-border rounded-lg bg-surface p-3 sm:p-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, company, role, source, notes..."
              className="w-full h-10 px-3 rounded-md bg-black/20 border border-border text-sm text-text-primary placeholder:text-text-dim"
            />
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortMode)}
              className="h-10 px-3 rounded-md bg-black/20 border border-border text-sm text-text-secondary min-w-[160px]"
            >
              <option value="rating">Sort: highest rating</option>
              <option value="newest">Sort: newest post</option>
              <option value="name">Sort: name</option>
              <option value="company">Sort: company</option>
            </select>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={() => onSelect(selectedIds)} disabled={selectedIds.length === 0 || loading} className="px-4 py-2 text-sm font-medium text-text-primary bg-page border border-border rounded-md disabled:opacity-40">
              Shortlist ({selectedIds.length})
            </button>
            <button onClick={() => onPrepare(selectedIds)} disabled={selectedIds.length === 0 || loading} className="px-4 py-2 text-sm font-medium text-black bg-green border border-green rounded-md disabled:opacity-40">
              {loading ? "Preparing..." : `Prepare outreach (${selectedIds.length})`}
            </button>
            <button onClick={onRefresh} disabled={scanning} className="px-4 py-2 text-sm font-medium text-text-secondary bg-page border border-border rounded-md disabled:opacity-40">
              {scanning ? "Scanning" : "Run Scan"}
            </button>
          </div>
        </div>
      </motion.div>

      <div className="hidden lg:block border border-border rounded-lg overflow-hidden bg-page">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="p-3 w-11 text-left">
                <input type="checkbox" checked={allVisibleSelected} onClick={toggleAll} readOnly aria-label="Select all actionable leads" />
              </th>
              <TH>Lead</TH>
              <TH>Opportunity</TH>
              <TH>Fit</TH>
              <TH>Contact</TH>
              <TH>Status</TH>
              <TH>Date</TH>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {visibleLeads.map((lead, index) => {
                const meta = LEAD_STATUS_META[lead.status] || LEAD_STATUS_META.new;
                const isSelected = selected.has(lead.id);
                const isActionable = lead.status === "new" || lead.status === "selected";
                return (
                  <motion.tr
                    key={lead.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.16, delay: index * 0.015 }}
                    className={`border-t border-border-subtle cursor-pointer transition-colors ${isSelected ? "bg-green-bg" : ""} ${meta.dimmed ? "opacity-60" : "hover:bg-surface/70"}`}
                    onClick={() => setActiveLead(lead)}
                  >
                    <td className="p-3" onClick={(event) => event.stopPropagation()}>
                      {isActionable ? (
                        <input type="checkbox" checked={isSelected} onClick={() => toggle(lead.id)} readOnly aria-label={`Select ${lead.name}`} />
                      ) : (
                        <span className="text-green">✓</span>
                      )}
                    </td>
                    <td className="p-3 min-w-[220px]">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-text-primary">{lead.name}</span>
                        <span className="text-xs text-text-muted">{lead.company || "Unknown company"} · {lead.location || "Unknown"}</span>
                      </div>
                    </td>
                    <td className="p-3 max-w-[260px]">
                      <p className="text-text-secondary truncate" title={lead.role_seeking}>{lead.role_seeking || "-"}</p>
                      {lead.salary ? <p className="mt-1 text-[11px] font-mono text-green">{lead.salary}</p> : null}
                    </td>
                    <td className="p-3"><Stars rating={lead.rating} /></td>
                    <td className="p-3"><ContactBadges lead={lead} /></td>
                    <td className="p-3"><StatusBadge status={lead.status} /></td>
                    <td className="p-3 text-xs text-text-muted font-mono whitespace-nowrap">{lead.post_date || "-"}</td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <AnimatePresence mode="popLayout">
          {visibleLeads.map((lead, index) => {
            const meta = LEAD_STATUS_META[lead.status] || LEAD_STATUS_META.new;
            const isSelected = selected.has(lead.id);
            const isActionable = lead.status === "new" || lead.status === "selected";
            return (
              <motion.article
                key={lead.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
                className={`p-4 border rounded-lg bg-surface ${isSelected ? "border-green-border bg-green-bg" : "border-border"} ${meta.dimmed ? "opacity-65" : ""}`}
                onClick={() => setActiveLead(lead)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div onClick={(event) => event.stopPropagation()}>
                      {isActionable ? (
                        <input type="checkbox" checked={isSelected} onClick={() => toggle(lead.id)} readOnly aria-label={`Select ${lead.name}`} />
                      ) : (
                        <span className="text-green">✓</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-text-dim">#{lead.id}</span>
                        <Stars rating={lead.rating} />
                      </div>
                      <p className="font-medium text-sm mt-0.5 truncate">{lead.name}</p>
                      <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{lead.role_seeking}</p>
                      <p className="text-xs text-text-muted mt-1 truncate">{lead.company || "Unknown"} · {lead.location || "UAE"}</p>
                    </div>
                  </div>
                  <StatusBadge status={lead.status} />
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </div>

      {activeLead ? (
        <LeadDetail
          lead={activeLead}
          onClose={() => setActiveLead(null)}
          onShortlist={(id) => onSelect([id])}
          onPrepare={(id) => onPrepare([id])}
          loading={loading}
        />
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: Lead["status"] }) {
  const meta = LEAD_STATUS_META[status] || LEAD_STATUS_META.new;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium whitespace-nowrap" style={{ color: meta.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
      {meta.label}
    </span>
  );
}

function ContactBadges({ lead }: { lead: Lead }) {
  return (
    <div className="flex gap-1">
      {lead.contact_email ? <span className="badge-contact" title={lead.contact_email}>@</span> : null}
      {lead.contact_linkedin ? <span className="badge-contact" title={lead.contact_linkedin}>in</span> : null}
      {lead.contact_phone ? <span className="badge-contact" title={lead.contact_phone}>tel</span> : null}
      {!lead.contact_email && !lead.contact_linkedin && !lead.contact_phone ? <span className="text-text-dim text-xs">-</span> : null}
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5" title={`${rating}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="text-[11px]" style={{ color: i <= rating ? "var(--color-yellow)" : "var(--color-border)" }}>
          ★
        </span>
      ))}
    </span>
  );
}

function TH({ children }: { children: React.ReactNode }) {
  return (
    <th className="p-3 text-left text-[11px] font-medium text-text-muted uppercase tracking-wider whitespace-nowrap" style={{ fontFamily: "var(--font-mono)" }}>
      {children}
    </th>
  );
}
