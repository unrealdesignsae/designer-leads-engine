import { NextResponse } from "next/server";
import { supabase, updateLeadStatus, updateOutreachStatus } from "@/lib/supabase";
import type { Lead, Outreach } from "@/lib/types";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteParams) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  const patch: Partial<Outreach> = {
    status: body.status,
    reply_snippet: body.reply_snippet ?? null,
    replied_at: body.replied_at ?? null,
    sent_at: body.sent_at ?? null,
    error: body.error ?? null,
  };

  const updated = await updateOutreachStatus(id, patch);

  if (body.lead_id && body.lead_status) {
    const leadFields: Partial<Lead> = {};
    if (body.lead_status === "replied" || body.lead_status === "interested") {
      leadFields.replied_at = body.replied_at || new Date().toISOString();
    }
    if (body.lead_status === "sent") {
      leadFields.contacted_at = body.sent_at || new Date().toISOString();
    }
    await updateLeadStatus(body.lead_id, body.lead_status, leadFields);
  }

  if (updated) return NextResponse.json(updated);

  if (supabase) {
    const { data } = await supabase
      .from("outreach")
      .select("*, lead:leads(*)")
      .eq("id", id)
      .single();
    if (data) return NextResponse.json(data);
  }

  return NextResponse.json(
    {
      id,
      ...patch,
      lead_id: body.lead_id,
      profile_id: body.profile_id,
    },
    { status: 200 }
  );
}
