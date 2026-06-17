import { NextResponse } from "next/server";
import { updateLeadStatus } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({ ids: [] }));
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id: unknown) => Number.isInteger(id))
    : [];

  if (!ids.length) {
    return NextResponse.json({ error: "No lead ids provided" }, { status: 400 });
  }

  await Promise.all(
    ids.map((id: number) => updateLeadStatus(id, "selected").catch(() => {}))
  );

  return NextResponse.json({ selected: ids.length, ids });
}
