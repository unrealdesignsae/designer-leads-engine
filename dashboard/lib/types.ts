// Designer Leads Dashboard — Data Types
export interface Lead {
  id: number;
  name: string;
  title: string;
  company: string;
  role_seeking: string;
  location: string;
  post_url: string;
  post_date: string;
  salary: string | null;
  source: string;
  contact_email: string | null;
  contact_phone: string | null;
  contact_linkedin: string | null;
  channels_available: string[];
  status: "new" | "selected" | "contacted" | "replied" | "interested" | "declined" | "failed";
  notes: string | null;
  discovered_at: string;
  contacted_at: string | null;
  replied_at: string | null;
}

export interface DailyScan {
  id: number;
  scan_date: string;
  leads_found: number;
  new_leads: number;
  dms_sent: number;
  replies_received: number;
  status: string;
}

export interface ContactAttempt {
  id: number;
  lead_id: number;
  channel: "linkedin" | "email" | "whatsapp";
  message_sent: string;
  sent_at: string;
  status: string;
  response: string | null;
  error: string | null;
}
