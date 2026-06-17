import { NextResponse } from "next/server";
import { prepareOutreachForLeadIds } from "@/lib/prepare-outreach";
import { getOutreach } from "@/lib/supabase";

const DRY_RUN = process.env.DISPATCH_LIVE !== "true";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profile_id") || undefined;
  const outreach = (await getOutreach(profileId)) || [];
  return NextResponse.json(outreach);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({ ids: [], profileId: undefined }));
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id: unknown) => Number.isInteger(id))
    : [];

  if (!ids.length) {
    return NextResponse.json({ error: "No lead ids provided" }, { status: 400 });
  }

  const prepared = await prepareOutreachForLeadIds(ids, body.profileId);

  return NextResponse.json({
    dryRun: DRY_RUN,
    prepared: prepared.outreach.length,
    leadIds: prepared.leadIds,
    profileId: prepared.profile.id,
    outreach: prepared.outreach,
  });
}
