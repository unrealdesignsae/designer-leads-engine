"use client";

import { motion } from "framer-motion";
import { LEAD_STATUS_META } from "@/lib/outreach";
import type { Lead } from "@/lib/types";

interface LeadDetailProps {
  lead: Lead;
  onClose: () => void;
  onShortlist: (id: number) => void;
  onPrepare: (id: number) => void;
  onArchive: (id: number) => void;
  onDelete: (id: number) => void;
  loading: boolean;
}

export default function LeadDetail({
  lead,
  onClose,
  onShortlist,
  onPrepare,
  onArchive,
  onDelete,
  loading,
}: LeadDetailProps) {
  const canShortlist = lead.status === "new";
  const canPrepare = lead.status === "new" || lead.status === "selected";
  const meta = LEAD_STATUS_META[lead.status] || LEAD_STATUS_META.new;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm sm:bg-black/30"
        onClick={onClose}
      />

      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 right-0 h-full w-full sm:w-[440px] z-50 bg-page border-l border-border overflow-y-auto"
      >
        <div className="sticky top-0 bg-page/95 backdrop-blur-md border-b border-border px-5 py-3.5 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-text-dim">#{lead.id}</span>
            <Stars rating={lead.rating} />
            <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: meta.color }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
              {meta.label}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md border border-border text-text-muted hover:text-text-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-6 space-y-5">
          <div>
            <h2 className="text-xl font-medium text-text-primary leading-tight">{lead.name}</h2>
            <p className="text-sm text-text-secondary mt-1.5">
              {lead.title}
              {lead.company && lead.title !== lead.company ? ` at ${lead.company}` : ""}
            </p>
            <p className="text-xs text-text-muted mt-1">{lead.location || "-"}</p>
          </div>

          <Field label="role seeking">
            <p className="text-sm text-text-primary">{lead.role_seeking || "-"}</p>
          </Field>

          {lead.salary ? (
            <Field label="salary">
              <span className="inline-flex items-center gap-1.5 text-sm font-mono text-green bg-green-bg px-2 py-0.5 rounded-sm">
                {lead.salary}
              </span>
            </Field>
          ) : null}

          <Field label="contact">
            <div className="space-y-2.5">
              <ContactRow icon="@" value={lead.contact_email} href={lead.contact_email ? `mailto:${lead.contact_email}` : undefined} />
              <ContactRow icon="in" value={lead.contact_linkedin ? `linkedin.com/in/${lead.contact_linkedin}` : null} href={lead.contact_linkedin ? `https://linkedin.com/in/${lead.contact_linkedin}` : undefined} />
              <ContactRow icon="tel" value={lead.contact_phone} />
            </div>
          </Field>

          <Field label="notes">
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
              {lead.notes || "No notes yet."}
            </p>
          </Field>

          <Field label="timeline">
            <div className="space-y-1 text-xs font-mono text-text-dim">
              <p>Discovered: {lead.discovered_at.slice(0, 10)}</p>
              {lead.contacted_at ? <p>Prepared: {lead.contacted_at.slice(0, 10)}</p> : null}
              {lead.replied_at ? <p>Replied: {lead.replied_at.slice(0, 10)}</p> : null}
            </div>
          </Field>

          <div className="flex gap-2 flex-wrap pt-1">
            {canShortlist ? (
              <button onClick={() => onShortlist(lead.id)} className="px-4 py-2.5 text-sm font-medium text-text-primary bg-surface border border-border rounded-md hover:border-yellow hover:text-yellow">
                Star shortlist
              </button>
            ) : null}
            {canPrepare ? (
              <button onClick={() => onPrepare(lead.id)} disabled={loading} className="px-4 py-2.5 text-sm font-medium text-black bg-green border border-green rounded-md disabled:opacity-50">
                {loading ? "Preparing..." : "Prepare outreach"}
              </button>
            ) : null}
            {lead.post_url ? (
              <a href={lead.post_url} target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 text-sm font-medium text-text-secondary bg-surface border border-border rounded-md">
                View source
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => onArchive(lead.id)}
              disabled={lead.status === "archived"}
              className="px-4 py-2.5 text-sm font-medium text-text-secondary bg-surface border border-border rounded-md disabled:opacity-40"
            >
              Archive
            </button>
            <button
              type="button"
              onClick={() => onDelete(lead.id)}
              className="px-4 py-2.5 text-sm font-medium text-crimson bg-surface border border-crimson/40 rounded-md"
            >
              Delete
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <code className="text-[11px] uppercase tracking-wider text-text-dim block mb-1.5" style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.075em" }}>
        {label}
      </code>
      {children}
    </div>
  );
}

function ContactRow({ icon, value, href }: { icon: string; value: string | null; href?: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <span className="w-6 h-6 flex items-center justify-center text-[10px] font-mono text-text-muted bg-surface border border-border rounded-sm flex-shrink-0">
        {icon}
      </span>
      {value ? (
        href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-green-link hover:text-green truncate">
            {value}
          </a>
        ) : (
          <span className="text-text-secondary truncate">{value}</span>
        )
      ) : (
        <span className="text-text-dim">-</span>
      )}
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
