import { NextResponse } from "next/server";
import { supabase, updateLeadStatus, updateOutreachStatus } from "@/lib/supabase";
import { sendMessage } from "@/lib/senders";
import type { Lead, Outreach } from "@/lib/types";

// Actually sends a prepared outreach message through its channel's provider,
// then marks it sent ONLY on a confirmed real send. On failure, records the
// error on the row and returns it so the UI can show why nothing went out.
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
  if (!row.lead) {
    return NextResponse.json({ ok: false, error: "Lead not found for this row." }, { status: 404 });
  }

  const result = await sendMessage(row.channel, row.lead, row.message_body);

  if (!result.ok) {
    await updateOutreachStatus(id, { error: result.error });
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }

  const sentAt = new Date().toISOString();
  const updated = await updateOutreachStatus(id, {
    status: "sent",
    sent_at: sentAt,
    error: null,
  });
  await updateLeadStatus(row.lead.id, "sent", { contacted_at: sentAt });

  return NextResponse.json({ ok: true, outreach: updated, sent_at: sentAt, ref: result.ref });
}
