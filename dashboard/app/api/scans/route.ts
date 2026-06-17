import { NextResponse } from "next/server";
import { SEED_SCANS } from "@/lib/leads-data";
import { normalizeProfileId } from "@/lib/outreach";
import { supabase } from "@/lib/supabase";
import type { DailyScan } from "@/lib/types";

export interface ScanRequest {
  profile_id?: string;
  target_count?: number;
  min_quality?: number;
  recency_days?: number;
  location?: string;
  must_include?: string[];
  must_exclude?: string[];
  score_with_llm?: boolean;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profile_id");

  if (supabase) {
    let query = supabase
      .from("daily_scans")
      .select("*")
      .order("scan_date", { ascending: false });

    if (profileId) query = query.eq("profile_id", profileId);

    const { data, error } = await query;
    if (!error && data) return NextResponse.json(data as DailyScan[]);
  }

  const scans = SEED_SCANS.filter((scan) =>
    profileId
      ? normalizeProfileId(scan.profile_id) === normalizeProfileId(profileId)
      : true
  );
  return NextResponse.json(scans);
}

export async function POST(request: Request) {
  let body: ScanRequest = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine, use defaults
  }

  const config = {
    target_count: body.target_count ?? 20,
    min_quality: body.min_quality ?? 1,
    recency_days: body.recency_days ?? 365,
    location: body.location ?? "UAE",
    must_include: body.must_include ?? [],
    must_exclude: body.must_exclude ?? [],
    score_with_llm: body.score_with_llm ?? true,
    profile_id: body.profile_id ?? null,
  };

  // Record that a scan was requested. The actual Python scanner runs on
  // Hermes (always-on) or locally. Here we log the intent to daily_scans
  // with status "queued" so the dashboard reflects the pending run.
  if (supabase && config.profile_id) {
    const { data, error } = await supabase
      .from("daily_scans")
      .insert({
        profile_id: config.profile_id,
        scan_date: new Date().toISOString().split("T")[0],
        leads_found: 0,
        new_leads: 0,
        dms_sent: 0,
        replies_received: 0,
        status: "queued",
        scan_config: JSON.stringify(config),
      })
      .select("*")
      .single();

    if (!error && data) {
      return NextResponse.json({
        ok: true,
        scan_id: (data as DailyScan).id,
        config,
        message: "Scan queued. Run `python scripts/scanner.py` on Hermes to execute.",
      });
    }
  }

  // Fallback when Supabase is unavailable
  return NextResponse.json({
    ok: true,
    scan_id: null,
    config,
    message: "Scan config received. Run `python scripts/scanner.py` on Hermes to execute.",
  });
}
