import { NextResponse } from "next/server";
import { DEFAULT_PROFILE, SEED_PROFILES, VAULT_LEADS } from "@/lib/leads-data";
import { createProfile, getProfiles, supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

export async function GET() {
  const profiles = (await getProfiles()) || [];

  if (supabase && profiles.length > 0) {
    const { data } = await supabase
      .from("leads")
      .select("profile_id")
      .not("profile_id", "is", null);

    const counts = new Map<string, number>();
    (data || []).forEach((row) => {
      const key = String(row.profile_id);
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return NextResponse.json(
      profiles.map((profile) => ({
        ...profile,
        lead_count: counts.get(String(profile.id)) || 0,
      }))
    );
  }

  return NextResponse.json(
    SEED_PROFILES.map((profile) => ({
      ...profile,
      lead_count: VAULT_LEADS.filter((lead) => String(lead.profile_id) === String(profile.id))
        .length,
    }))
  );
}

export async function POST(request: Request) {
  const body = await request.json();

  const payload: Omit<Profile, "id" | "created_at"> = {
    name: String(body.name || "New Campaign").trim(),
    slug: slugify(String(body.slug || body.name || "new-campaign")),
    description: String(body.description || "").trim(),
    icp_keywords: arrayField(body.icp_keywords),
    scan_queries: arrayField(body.scan_queries),
    message_templates: {
      linkedin: String(body.message_templates?.linkedin || ""),
      email: String(body.message_templates?.email || ""),
      whatsapp: String(body.message_templates?.whatsapp || ""),
    },
    portfolio_url: String(body.portfolio_url || DEFAULT_PROFILE.portfolio_url),
    pdf_url: String(body.pdf_url || DEFAULT_PROFILE.pdf_url),
    accent_color: String(body.accent_color || "#3ecf8e"),
    is_active: body.is_active ?? true,
  };

  const inserted = await createProfile(payload);
  if (inserted) return NextResponse.json(inserted, { status: 201 });

  const fallback: Profile = {
    id: `local-${payload.slug}-${Date.now()}`,
    created_at: new Date().toISOString(),
    ...payload,
  };

  return NextResponse.json(fallback, { status: 201 });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function arrayField(input: unknown): string[] {
  if (Array.isArray(input)) return input.map((item) => String(item).trim()).filter(Boolean);
  return String(input || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}
