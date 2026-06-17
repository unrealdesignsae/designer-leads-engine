import type { DailyScan, Lead, Outreach, Profile, ProfileId } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function fetchProfiles(): Promise<Profile[]> {
  return requestJson<Profile[]>(`${API_BASE}/profiles`);
}

export async function saveProfile(
  profile: Omit<Profile, "id" | "created_at">
): Promise<Profile> {
  return requestJson<Profile>(`${API_BASE}/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
}

export async function fetchLeads(profileId?: ProfileId, status?: string): Promise<Lead[]> {
  const params = new URLSearchParams();
  if (profileId !== undefined && profileId !== null && profileId !== "") {
    params.set("profile_id", String(profileId));
  }
  if (status) params.set("status", status);
  const query = params.toString();
  return requestJson<Lead[]>(`${API_BASE}/leads${query ? `?${query}` : ""}`);
}

export async function fetchScans(profileId?: ProfileId): Promise<DailyScan[]> {
  const params = profileId ? `?profile_id=${encodeURIComponent(String(profileId))}` : "";
  return requestJson<DailyScan[]>(`${API_BASE}/scans${params}`);
}

export async function fetchOutreach(profileId?: ProfileId): Promise<Outreach[]> {
  const params = profileId ? `?profile_id=${encodeURIComponent(String(profileId))}` : "";
  return requestJson<Outreach[]>(`${API_BASE}/outreach${params}`);
}

export async function selectLeads(ids: number[]): Promise<void> {
  await requestJson(`${API_BASE}/leads/select`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
}

export async function prepareOutreach(ids: number[], profileId?: ProfileId) {
  return requestJson<{
    prepared: number;
    leadIds: number[];
    outreach: Outreach[];
    profileId: ProfileId;
  }>(`${API_BASE}/outreach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids, profileId }),
  });
}

export async function sendOutreach(
  id: string | number
): Promise<{ ok: boolean; error?: string; sent_at?: string; outreach?: Outreach }> {
  const res = await fetch(`${API_BASE}/outreach/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  return res.json();
}

export async function patchOutreach(
  id: string | number,
  payload: Partial<Outreach> & { lead_id?: number; lead_status?: Lead["status"] }
) {
  return requestJson<Outreach>(`${API_BASE}/outreach/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateLead(
  id: number,
  payload: Partial<Lead>
): Promise<Lead> {
  return requestJson<Lead>(`${API_BASE}/leads/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteLead(id: number): Promise<{ ok: boolean; id: number }> {
  return requestJson<{ ok: boolean; id: number }>(`${API_BASE}/leads/${id}`, {
    method: "DELETE",
  });
}
