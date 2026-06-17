import { NextResponse } from "next/server";
import { VAULT_LEADS } from "@/lib/leads-data";
import { normalizeProfileId } from "@/lib/outreach";
import { getLeads } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const profileId = searchParams.get("profile_id");

  const supabaseLeads = await getLeads(profileId || undefined).catch(() => []);

  const allLeads =
    supabaseLeads && supabaseLeads.length > 0
      ? supabaseLeads
      : VAULT_LEADS.filter((lead) =>
          profileId
            ? normalizeProfileId(lead.profile_id) === normalizeProfileId(profileId) ||
              lead.profile_slug === profileId
            : true
        );

  const leads = status ? allLeads.filter((lead) => lead.status === status) : allLeads;
  return NextResponse.json(leads);
}
