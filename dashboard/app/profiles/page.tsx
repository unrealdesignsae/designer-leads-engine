"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { saveProfile } from "@/lib/api";
import { accentStyle } from "@/lib/outreach";
import { useProfiles } from "@/lib/profiles";
import { useLeads } from "@/lib/store";
import { useToast } from "@/components/Toast";

type FormState = {
  name: string;
  description: string;
  icp_keywords: string;
  scan_queries: string;
  linkedin: string;
  email: string;
  whatsapp: string;
  portfolio_url: string;
  pdf_url: string;
  accent_color: string;
};

export default function ProfilesPage() {
  const { profiles, activeProfileId, switchProfile, addProfile } = useProfiles();
  const { state } = useLeads();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    icp_keywords: "",
    scan_queries: "",
    linkedin: "",
    email: "",
    whatsapp: "",
    portfolio_url: "",
    pdf_url: "",
    accent_color: "#3ecf8e",
  });

  const profileCards = useMemo(
    () =>
      profiles.map((profile) => ({
        ...profile,
        lead_count:
          String(profile.id) === String(activeProfileId)
            ? state.leads.length
            : profile.lead_count || 0,
      })),
    [activeProfileId, profiles, state.leads.length]
  );

  async function handleCreateProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const profile = await saveProfile({
        name: form.name.trim(),
        slug: form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        description: form.description.trim(),
        icp_keywords: splitLines(form.icp_keywords),
        scan_queries: splitLines(form.scan_queries),
        message_templates: {
          linkedin: form.linkedin.trim(),
          email: form.email.trim(),
          whatsapp: form.whatsapp.trim(),
          instagram: (form as any).instagram?.trim?.() || form.linkedin.trim(),
        },
        portfolio_url: form.portfolio_url.trim(),
        pdf_url: form.pdf_url.trim(),
        accent_color: form.accent_color,
        is_active: true,
      });
      addProfile(profile);
      toast("Profile created", "success");
    } catch {
      toast("Failed to create profile", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <code className="mono-label block mb-2">profiles</code>
        <h1 className="text-3xl sm:text-4xl font-light text-text-primary tracking-tight" style={{ lineHeight: "1.1" }}>
          Campaign Profiles
        </h1>
      </motion.div>

      <section className="mb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {profileCards.map((profile, index) => {
            const active = String(profile.id) === String(activeProfileId);
            return (
              <motion.button
                key={String(profile.id)}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => switchProfile(profile.id)}
                className={`text-left rounded-xl border p-4 transition-all ${active ? "border-green-border" : "border-border hover:border-border-prominent"}`}
                style={accentStyle(profile.accent_color)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: profile.accent_color }} />
                    <p className="text-sm font-medium text-text-primary">{profile.name}</p>
                  </div>
                  <span className="text-[10px] font-mono text-text-dim">{profile.lead_count || 0} leads</span>
                </div>
                <p className="text-xs text-text-muted mt-2 leading-relaxed">{profile.description}</p>
              </motion.button>
            );
          })}
        </div>
      </section>

      <section className="border border-border rounded-xl bg-surface p-5 sm:p-6">
        <form className="grid grid-cols-1 lg:grid-cols-2 gap-4" onSubmit={handleCreateProfile}>
          <TextField label="Name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} required />
          <TextField label="Accent color" value={form.accent_color} onChange={(value) => setForm((current) => ({ ...current, accent_color: value }))} />
          <TextArea label="Description" value={form.description} onChange={(value) => setForm((current) => ({ ...current, description: value }))} className="lg:col-span-2" />
          <TextArea label="ICP keywords" value={form.icp_keywords} onChange={(value) => setForm((current) => ({ ...current, icp_keywords: value }))} />
          <TextArea label="Scan queries" value={form.scan_queries} onChange={(value) => setForm((current) => ({ ...current, scan_queries: value }))} />
          <TextArea label="LinkedIn template" value={form.linkedin} onChange={(value) => setForm((current) => ({ ...current, linkedin: value }))} className="lg:col-span-2" />
          <TextArea label="Email template" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} className="lg:col-span-2" />
          <TextArea label="WhatsApp template" value={form.whatsapp} onChange={(value) => setForm((current) => ({ ...current, whatsapp: value }))} className="lg:col-span-2" />
          <TextField label="Portfolio URL" value={form.portfolio_url} onChange={(value) => setForm((current) => ({ ...current, portfolio_url: value }))} />
          <TextField label="PDF URL" value={form.pdf_url} onChange={(value) => setForm((current) => ({ ...current, pdf_url: value }))} />
          <div className="lg:col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-md bg-green text-black text-sm font-medium disabled:opacity-50">
              {saving ? "Creating..." : "Create profile"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function TextField({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-1.5">{label}</span>
      <input value={value} required={required} onChange={(event) => onChange(event.target.value)} className="w-full h-11 px-3 rounded-md bg-black/10 border border-border text-sm text-text-primary" />
    </label>
  );
}

function TextArea({ label, value, onChange, className = "" }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-1.5">{label}</span>
      <textarea rows={5} value={value} onChange={(event) => onChange(event.target.value)} className="w-full px-3 py-2.5 rounded-md bg-black/10 border border-border text-sm text-text-primary resize-y" />
    </label>
  );
}

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}
