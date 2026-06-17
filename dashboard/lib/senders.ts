import type { Lead } from "./types";

// Real message senders. Each returns ok:true only on a confirmed provider send.
// If credentials are missing, returns a precise error so the UI shows WHY nothing
// went out instead of silently doing nothing.

export type SendResult = { ok: true; ref?: string } | { ok: false; error: string };

export async function sendMessage(
  channel: string,
  lead: Lead,
  body: string
): Promise<SendResult> {
  switch (channel) {
    case "email":
      return sendEmail(lead, body);
    case "linkedin":
      return sendLinkedIn(lead, body);
    case "whatsapp":
      return sendWhatsApp(lead, body);
    default:
      return { ok: false, error: `Unknown channel: ${channel}` };
  }
}

// ---- Email via Resend ----
async function sendEmail(lead: Lead, body: string): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from) {
    return {
      ok: false,
      error: "Email not configured. Set RESEND_API_KEY and RESEND_FROM in env.",
    };
  }
  if (!lead.contact_email) {
    return { ok: false, error: `${lead.name || "Lead"} has no email address.` };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: lead.contact_email,
        subject: process.env.RESEND_SUBJECT || "Quick note",
        text: body,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      return { ok: false, error: `Resend ${res.status}: ${detail.slice(0, 200)}` };
    }
    const data = await res.json();
    return { ok: true, ref: data?.id };
  } catch (e) {
    return { ok: false, error: `Email send failed: ${(e as Error).message}` };
  }
}

// ---- LinkedIn via Unipile ----
// Requires a LinkedIn account CONNECTED inside Unipile, plus the DSN + account_id.
async function sendLinkedIn(lead: Lead, body: string): Promise<SendResult> {
  const dsn = process.env.UNIPILE_DSN;
  const key = process.env.UNIPILE_API_KEY;
  const account = process.env.UNIPILE_LINKEDIN_ACCOUNT_ID;
  if (!dsn || !key || !account) {
    return {
      ok: false,
      error:
        "LinkedIn not connected. Set UNIPILE_DSN, UNIPILE_API_KEY, and UNIPILE_LINKEDIN_ACCOUNT_ID (LinkedIn must be connected in your Unipile account).",
    };
  }
  const identifier = lead.contact_linkedin;
  if (!identifier) {
    return { ok: false, error: `${lead.name || "Lead"} has no LinkedIn handle.` };
  }
  const base = `https://${dsn.replace(/^https?:\/\//, "")}/api/v1`;
  const headers = { "X-API-KEY": key, "Content-Type": "application/json" };
  try {
    // Resolve the public handle to Unipile's internal provider id.
    const userRes = await fetch(
      `${base}/users/${encodeURIComponent(identifier)}?account_id=${account}`,
      { headers }
    );
    if (!userRes.ok) {
      return {
        ok: false,
        error: `Unipile could not resolve ${identifier} (${userRes.status}). The lead may not be reachable from your account.`,
      };
    }
    const user = await userRes.json();
    const providerId = user?.provider_id || user?.id;
    if (!providerId) {
      return { ok: false, error: `No provider id for ${identifier}.` };
    }
    // Start a new chat with the resolved attendee.
    const chatRes = await fetch(`${base}/chats`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        account_id: account,
        attendees_ids: [providerId],
        text: body,
      }),
    });
    if (!chatRes.ok) {
      const detail = await chatRes.text();
      return { ok: false, error: `Unipile send ${chatRes.status}: ${detail.slice(0, 200)}` };
    }
    const chat = await chatRes.json();
    return { ok: true, ref: chat?.chat_id || chat?.id };
  } catch (e) {
    return { ok: false, error: `LinkedIn send failed: ${(e as Error).message}` };
  }
}

// ---- WhatsApp via Unipile ----
async function sendWhatsApp(lead: Lead, body: string): Promise<SendResult> {
  const dsn = process.env.UNIPILE_DSN;
  const key = process.env.UNIPILE_API_KEY;
  const account = process.env.UNIPILE_WHATSAPP_ACCOUNT_ID;
  if (!dsn || !key || !account) {
    return {
      ok: false,
      error:
        "WhatsApp not connected. Set UNIPILE_DSN, UNIPILE_API_KEY, and UNIPILE_WHATSAPP_ACCOUNT_ID.",
    };
  }
  if (!lead.contact_phone) {
    return { ok: false, error: `${lead.name || "Lead"} has no phone number.` };
  }
  const base = `https://${dsn.replace(/^https?:\/\//, "")}/api/v1`;
  const headers = { "X-API-KEY": key, "Content-Type": "application/json" };
  const phone = lead.contact_phone.replace(/[^\d]/g, "");
  try {
    const chatRes = await fetch(`${base}/chats`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        account_id: account,
        attendees_ids: [`${phone}@s.whatsapp.net`],
        text: body,
      }),
    });
    if (!chatRes.ok) {
      const detail = await chatRes.text();
      return { ok: false, error: `WhatsApp send ${chatRes.status}: ${detail.slice(0, 200)}` };
    }
    const chat = await chatRes.json();
    return { ok: true, ref: chat?.chat_id || chat?.id };
  } catch (e) {
    return { ok: false, error: `WhatsApp send failed: ${(e as Error).message}` };
  }
}
