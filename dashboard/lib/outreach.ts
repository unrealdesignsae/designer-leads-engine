import type {
  Lead,
  LeadStatus,
  MessageTemplates,
  Outreach,
  OutreachChannel,
  Profile,
  ProfileId,
} from "./types";

export const LEAD_STATUS_META: Record<
  LeadStatus,
  { label: string; color: string; dimmed?: boolean }
> = {
  new: { label: "New", color: "var(--color-text-muted)" },
  selected: { label: "Selected", color: "var(--color-yellow)" },
  queued: { label: "Queued", color: "var(--color-purple)" },
  ready_to_send: { label: "Ready", color: "var(--color-blue)" },
  sent: { label: "Sent", color: "var(--color-purple)" },
  replied: { label: "Replied", color: "var(--color-green)" },
  interested: { label: "Interested", color: "var(--color-green)" },
  declined: { label: "Declined", color: "var(--color-text-dim)", dimmed: true },
  failed: { label: "Failed", color: "var(--color-crimson)", dimmed: true },
};

export function normalizeProfileId(profileId?: ProfileId | null): string {
  return String(profileId ?? "");
}

export function personalizeTemplate(
  template: string,
  lead: Lead,
  profile: Profile
): string {
  const replacements: Record<string, string> = {
    "{name}": lead.name || "there",
    "{company}": lead.company || "your team",
    "{role_seeking}": lead.role_seeking || "creative role",
    "{title}": lead.title || "",
    "{location}": lead.location || "",
    "{portfolio_url}": profile.portfolio_url || "",
    "{pdf_url}": profile.pdf_url || "",
    "{profile_name}": profile.name || "",
  };

  return Object.entries(replacements).reduce(
    (message, [needle, value]) => message.split(needle).join(value),
    template
  );
}

export function profileTemplates(profile: Profile): MessageTemplates {
  return {
    linkedin: profile.message_templates.linkedin || "",
    email: profile.message_templates.email || "",
    whatsapp: profile.message_templates.whatsapp || "",
  };
}

export function buildPreparedOutreachRows(
  lead: Lead,
  profile: Profile,
  now = new Date().toISOString()
): Outreach[] {
  const templates = profileTemplates(profile);
  const channels = (lead.channels_available || []).filter(
    (channel): channel is OutreachChannel =>
      channel === "linkedin" || channel === "email" || channel === "whatsapp"
  );

  return channels.map((channel, index) => ({
    id: `local-${lead.id}-${channel}-${index}-${Date.now()}`,
    lead_id: lead.id,
    profile_id: profile.id,
    channel,
    message_body: personalizeTemplate(templates[channel], lead, profile),
    status: "ready_to_send",
    prepared_at: now,
    sent_at: null,
    replied_at: null,
    reply_snippet: null,
    error: null,
    lead,
  }));
}

export function accentStyle(accent: string): { borderColor: string; backgroundColor: string } {
  return {
    borderColor: `${accent}55`,
    backgroundColor: `${accent}14`,
  };
}
