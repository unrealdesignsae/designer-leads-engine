import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { Lead } from "@/lib/types";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteParams) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const fields: Partial<Lead> = {};
  if (body.status) fields.status = body.status;
  if (body.notes !== undefined) fields.notes = body.notes;

  const { data, error } = await supabase
    .from("leads")
    .update(fields)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

export async function DELETE(_request: Request, context: RouteParams) {
  const { id } = await context.params;

  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const { error: outreachError } = await supabase
    .from("outreach")
    .delete()
    .eq("lead_id", id);

  if (outreachError) {
    return NextResponse.json({ error: outreachError.message }, { status: 400 });
  }

  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id });
}
