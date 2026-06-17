import { NextResponse } from "next/server";
import { supabase, updateOutreachStatus } from "@/lib/supabase";
import type { Lead, Outreach } from "@/lib/types";

// Dashboard "Send" button now QUEUES the message in Supabase.
// Hermes (local, with Unipile MCP) picks up queued items and actually sends them.
// This way the dashboard never touches Unipile/Resend credentials directly.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const id = body.id;
  if (!id) {
    return NextResponse.json({ ok: false, error: "No outreach id provided" }, { status: 400 });
  }
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured on server." },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from("outreach")
    .select("*, lead:leads(*)")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "Outreach row not found." }, { status: 404 });
  }

  const row = data as Outreach & { lead: Lead | null };
  if (row.status === "sent") {
    return NextResponse.json({ ok: true, alreadySent: true });
  }
  if (row.status === "queued") {
    return NextResponse.json({ ok: true, alreadyQueued: true });
  }
  if (!row.lead) {
    return NextResponse.json({ ok: false, error: "Lead not found for this row." }, { status: 404 });
  }

  // Queue the message — Hermes picks it up and sends via Unipile MCP
  const queuedAt = new Date().toISOString();
  await updateOutreachStatus(id, {
    status: "queued",
    prepared_at: queuedAt,
    error: null,
  });

  return NextResponse.json({
    ok: true,
    queued: true,
    channel: row.channel,
    lead_name: row.lead.name,
    sent_at: queuedAt,
    note: "Queued for Hermes to send via Unipile MCP.",
  });
}