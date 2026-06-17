import { DEFAULT_PROFILE, SEED_PROFILES, VAULT_LEADS } from "./leads-data";
import { buildPreparedOutreachRows, normalizeProfileId } from "./outreach";
import { getLeads, getProfiles, supabase } from "./supabase";
import type { Lead, Outreach, ProfileId } from "./types";

export async function prepareOutreachForLeadIds(ids: number[], profileId?: ProfileId) {
  const normalizedProfileId = normalizeProfileId(profileId || DEFAULT_PROFILE.id);

  const profiles = (await getProfiles()) || [];
  const profile =
    profiles.find(
      (item) =>
        normalizeProfileId(item.id) === normalizedProfileId ||
        item.slug === normalizedProfileId
    ) ||
    SEED_PROFILES.find(
      (item) =>
        normalizeProfileId(item.id) === normalizedProfileId ||
        item.slug === normalizedProfileId
    ) ||
    DEFAULT_PROFILE;

  const leads =
    (await getLeads(profile.id)) ||
    VAULT_LEADS.filter(
      (lead) =>
        normalizeProfileId(lead.profile_id) === normalizeProfileId(profile.id) ||
        lead.profile_slug === profile.slug
    );

  const selectedLeads = ids
    .map((id) => leads.find((lead) => lead.id === id))
    .filter((lead): lead is Lead => Boolean(lead));

  const preparedAt = new Date().toISOString();
  const outreachRows = selectedLeads.flatMap((lead) =>
    buildPreparedOutreachRows(lead, profile, preparedAt)
  );

  if (supabase && outreachRows.length > 0) {
    const { data, error } = await supabase
      .from("outreach")
      .insert(
        outreachRows.map((row) => ({
          lead_id: row.lead_id,
          profile_id: row.profile_id,
          channel: row.channel,
          message_body: row.message_body,
          status: row.status,
          prepared_at: row.prepared_at,
        }))
      )
      .select("*, lead:leads(*)");

    if (!error) {
      await supabase
        .from("leads")
        .update({
          status: "ready_to_send",
          contacted_at: preparedAt,
        })
        .in("id", selectedLeads.map((lead) => lead.id));

      return {
        profile,
        preparedAt,
        leadIds: selectedLeads.map((lead) => lead.id),
        outreach: (data || []) as Outreach[],
      };
    }
  }

  return {
    profile,
    preparedAt,
    leadIds: selectedLeads.map((lead) => lead.id),
    outreach: outreachRows,
  };
}
