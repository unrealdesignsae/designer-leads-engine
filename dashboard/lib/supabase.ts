import { createClient } from "@supabase/supabase-js";
import type { Lead, Outreach, Profile, ProfileId } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export async function getProfiles(): Promise<Profile[] | null> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[supabase] getProfiles error:", error.message);
    return [];
  }

  return (data || []) as Profile[];
}

export async function createProfile(
  profile: Omit<Profile, "id" | "created_at">
): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .insert(profile)
    .select("*")
    .single();

  if (error) {
    console.error("[supabase] createProfile error:", error.message);
    return null;
  }

  return data as Profile;
}

export async function getLeads(profileId?: ProfileId): Promise<Lead[] | null> {
  if (!supabase) return [];
  let query = supabase
    .from("leads")
    .select("*")
    .order("rating", { ascending: false })
    .order("discovered_at", { ascending: false });

  if (profileId !== undefined && profileId !== null && profileId !== "") {
    query = query.eq("profile_id", profileId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[supabase] getLeads error:", error.message);
    return [];
  }
  return (data || []) as Lead[];
}

export async function getOutreach(profileId?: ProfileId): Promise<Outreach[] | null> {
  if (!supabase) return [];
  let query = supabase
    .from("outreach")
    .select("*, lead:leads(*)")
    .order("prepared_at", { ascending: false });

  if (profileId !== undefined && profileId !== null && profileId !== "") {
    query = query.eq("profile_id", profileId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[supabase] getOutreach error:", error.message);
    return [];
  }

  return (data || []) as Outreach[];
}

export async function createOutreach(
  record: Partial<Outreach> | Array<Partial<Outreach>>
): Promise<Outreach[] | null> {
  if (!supabase) return [];
  const payload = Array.isArray(record) ? record : [record];
  const { data, error } = await supabase
    .from("outreach")
    .insert(payload)
    .select("*, lead:leads(*)");

  if (error) {
    console.error("[supabase] createOutreach error:", error.message);
    return [];
  }

  return (data || []) as Outreach[];
}

export async function updateLeadStatus(
  id: number,
  status: Lead["status"],
  fields: Partial<Lead> = {}
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("leads")
    .update({ ...fields, status })
    .eq("id", id);

  if (error) {
    console.error("[supabase] updateLeadStatus error:", error.message);
  }
}

export async function updateOutreachStatus(
  id: string | number,
  fields: Partial<Outreach>
): Promise<Outreach | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("outreach")
    .update(fields)
    .eq("id", id)
    .select("*, lead:leads(*)")
    .single();

  if (error) {
    console.error("[supabase] updateOutreachStatus error:", error.message);
    return null;
  }

  return data as Outreach;
}
