// Designer Leads Dashboard — Data fetcher
// In production: reads from Supabase. In dev: reads from local SQLite via API.

import { Lead, DailyScan } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

export async function fetchLeads(status?: string): Promise<Lead[]> {
  const params = status ? `?status=${status}` : "";
  const res = await fetch(`${API_BASE}/leads${params}`);
  if (!res.ok) throw new Error("Failed to fetch leads");
  return res.json();
}

export async function fetchScans(): Promise<DailyScan[]> {
  const res = await fetch(`${API_BASE}/scans`);
  if (!res.ok) throw new Error("Failed to fetch scans");
  return res.json();
}

export async function selectLeads(ids: number[]): Promise<void> {
  const res = await fetch(`${API_BASE}/leads/select`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error("Failed to select leads");
}

export async function dispatchLeads(ids: number[]): Promise<{ dispatched: number; results: any[] }> {
  const res = await fetch(`${API_BASE}/leads/dispatch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error("Failed to dispatch leads");
  return res.json();
}