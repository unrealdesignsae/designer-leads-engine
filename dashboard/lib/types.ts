export type ProfileId = string | number;

export type LeadStatus =
  | "new"
  | "selected"
  | "queued"
  | "ready_to_send"
  | "sent"
  | "replied"
  | "interested"
  | "declined"
  | "failed";

export type OutreachChannel = "linkedin" | "email" | "whatsapp" | "instagram";

export type OutreachStatus =
  | "ready_to_send"
  | "queued"
  | "sent"
  | "replied"
  | "bounced"
  | "skipped";

export interface MessageTemplates {
  linkedin: string;
  email: string;
  whatsapp: string;
  instagram: string;
}

export interface Profile {
  id: ProfileId;
  name: string;
  slug: string;
  description: string;
  icp_keywords: string[];
  scan_queries: string[];
  message_templates: MessageTemplates;
  portfolio_url: string;
  pdf_url: string;
  accent_color: string;
  created_at?: string;
  is_active?: boolean;
  lead_count?: number;
}

export interface Lead {
  id: number;
  profile_id?: ProfileId;
  profile_slug?: string;
  name: string;
  title: string;
  company: string;
  role_seeking: string;
  location: string;
  post_url: string | null;
  post_date: string;
  salary: string | null;
  source: string;
  contact_email: string | null;
  contact_phone: string | null;
  contact_linkedin: string | null;
  channels_available: string[];
  status: LeadStatus;
  rating: number;
  notes: string | null;
  discovered_at: string;
  contacted_at: string | null;
  replied_at: string | null;
}

export interface DailyScan {
  id: number;
  profile_id?: ProfileId;
  scan_date: string;
  leads_found: number;
  new_leads: number;
  dms_sent: number;
  replies_received: number;
  status: string;
}

export interface Outreach {
  id: string | number;
  lead_id: number;
  profile_id: ProfileId;
  channel: OutreachChannel;
  message_body: string;
  status: OutreachStatus;
  prepared_at: string;
  sent_at: string | null;
  replied_at: string | null;
  reply_snippet: string | null;
  error: string | null;
  lead?: Lead | null;
}

export type ContactAttempt = Outreach;
