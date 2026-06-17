"use client";

import { motion } from "framer-motion";
import { LEAD_STATUS_META } from "@/lib/outreach";
import type { Lead } from "@/lib/types";

export default function OverviewCharts({ leads }: { leads: Lead[] }) {
  const total = Math.max(leads.length, 1);
  const statuses: Lead["status"][] = [
    "new",
    "selected",
    "queued",
    "ready_to_send",
    "replied",
    "interested",
  ];

  const statusRows = statuses.map((status) => ({
    key: status,
    label: LEAD_STATUS_META[status].label,
    color: LEAD_STATUS_META[status].color,
    count: leads.filter((lead) => lead.status === status).length,
  }));

  const ratingRows = [5, 4, 3, 2, 1].map((rating) => ({
    key: String(rating),
    label: `${rating} star`,
    count: leads.filter((lead) => lead.rating === rating).length,
    color:
      rating >= 5
        ? "var(--color-green)"
        : rating === 4
          ? "var(--color-yellow)"
          : "var(--color-text-muted)",
  }));

  const channels = ["linkedin", "email", "whatsapp"].map((channel) => ({
    key: channel,
    label: channel === "linkedin" ? "LinkedIn" : channel === "email" ? "Email" : "WhatsApp",
    count: leads.filter((lead) => lead.channels_available?.includes(channel)).length,
    color:
      channel === "linkedin"
        ? "var(--color-blue)"
        : channel === "email"
          ? "var(--color-green)"
          : "var(--color-yellow)",
  }));

  return (
    <section className="pb-6 sm:pb-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ChartCard title="Status funnel" subtitle="profile progression">
          <BarRows rows={statusRows} total={total} />
        </ChartCard>
        <ChartCard title="Fit rating" subtitle="quality distribution">
          <BarRows rows={ratingRows} total={total} />
        </ChartCard>
        <ChartCard title="Reach channels" subtitle="available contact paths">
          <BarRows rows={channels} total={total} />
        </ChartCard>
      </div>
    </section>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="border border-border rounded-lg bg-surface p-4">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-text-primary">{title}</h3>
        <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
      </div>
      {children}
    </motion.div>
  );
}

function BarRows({ rows, total }: { rows: { key: string; label: string; count: number; color: string }[]; total: number }) {
  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const pct = Math.round((row.count / total) * 100);
        return (
          <div key={row.key}>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-text-secondary">{row.label}</span>
              <span className="font-mono text-text-muted">{row.count}</span>
            </div>
            <div className="h-2 rounded-pill bg-black/25 border border-border-subtle overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="h-full rounded-pill" style={{ background: row.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
