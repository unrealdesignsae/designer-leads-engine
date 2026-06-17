"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from "react";
import { fetchLeads, fetchOutreach, fetchScans } from "./api";
import { SEED_SCANS, VAULT_LEADS } from "./leads-data";
import { normalizeProfileId } from "./outreach";
import { useProfiles } from "./profiles";
import type { DailyScan, Lead, Outreach } from "./types";

export type State = {
  leads: Lead[];
  scans: DailyScan[];
  outreach: Outreach[];
  loading: boolean;
  scanning: boolean;
  initialLoad: boolean;
};

type Action =
  | { type: "LOAD"; leads: Lead[]; scans: DailyScan[]; outreach: Outreach[] }
  | { type: "SELECT"; ids: number[] }
  | { type: "PREPARE_START" }
  | { type: "PREPARE_DONE"; leadIds: number[]; outreach: Outreach[] }
  | { type: "SCAN_START" }
  | { type: "SCAN_DONE"; scan: DailyScan; leads: Lead[] }
  | { type: "UPDATE_OUTREACH"; outreach: Outreach; leadStatus?: Lead["status"] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "LOAD":
      return {
        ...state,
        leads: action.leads,
        scans: action.scans,
        outreach: action.outreach,
        loading: false,
        initialLoad: false,
      };
    case "SELECT":
      return {
        ...state,
        leads: state.leads.map((lead) =>
          action.ids.includes(lead.id) && lead.status === "new"
            ? { ...lead, status: "selected" }
            : lead
        ),
      };
    case "PREPARE_START":
      return { ...state, loading: true };
    case "PREPARE_DONE":
      return {
        ...state,
        loading: false,
        leads: state.leads.map((lead) =>
          action.leadIds.includes(lead.id)
            ? {
                ...lead,
                status: "ready_to_send",
                contacted_at: new Date().toISOString(),
              }
            : lead
        ),
        outreach: [...action.outreach, ...state.outreach].sort(
          (a, b) =>
            new Date(b.prepared_at).getTime() - new Date(a.prepared_at).getTime()
        ),
      };
    case "SCAN_START":
      return { ...state, scanning: true };
    case "SCAN_DONE":
      return {
        ...state,
        scanning: false,
        leads: action.leads,
        scans: [action.scan, ...state.scans],
      };
    case "UPDATE_OUTREACH":
      if (!action.leadStatus) {
        return {
          ...state,
          outreach: state.outreach.map((row) =>
            String(row.id) === String(action.outreach.id) ? action.outreach : row
          ),
        };
      }
      const leadStatus = action.leadStatus;
      return {
        ...state,
        outreach: state.outreach.map((row) =>
          String(row.id) === String(action.outreach.id) ? action.outreach : row
        ),
        leads: state.leads.map((lead) =>
          lead.id === action.outreach.lead_id
            ? {
                ...lead,
                status: leadStatus,
                replied_at:
                  leadStatus === "replied" ||
                  leadStatus === "interested"
                    ? action.outreach.replied_at || new Date().toISOString()
                    : lead.replied_at,
              }
            : lead
        ),
      };
    default:
      return state;
  }
}

type Ctx = { state: State; dispatch: React.Dispatch<Action> };

const LeadsCtx = createContext<Ctx>({
  state: {
    leads: [],
    scans: [],
    outreach: [],
    loading: false,
    scanning: false,
    initialLoad: true,
  },
  dispatch: () => {},
});

export const useLeads = () => useContext(LeadsCtx);

export function LeadsProvider({ children }: { children: ReactNode }) {
  const { activeProfileId } = useProfiles();
  const [state, dispatch] = useReducer(reducer, {
    leads: [],
    scans: [],
    outreach: [],
    loading: false,
    scanning: false,
    initialLoad: true,
  });

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetchLeads(activeProfileId).catch(() => fallbackLeads(activeProfileId)),
      fetchScans(activeProfileId).catch(() => fallbackScans(activeProfileId)),
      fetchOutreach(activeProfileId).catch(() => [] as Outreach[]),
    ]).then(([leads, scans, outreach]) => {
      if (cancelled) return;
      dispatch({
        type: "LOAD",
        leads: leads.length > 0 ? leads : fallbackLeads(activeProfileId),
        scans: scans.length > 0 ? scans : fallbackScans(activeProfileId),
        outreach,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [activeProfileId]);

  return <LeadsCtx.Provider value={{ state, dispatch }}>{children}</LeadsCtx.Provider>;
}

function fallbackLeads(profileId: string | number): Lead[] {
  return VAULT_LEADS.filter(
    (lead) =>
      normalizeProfileId(lead.profile_id) === normalizeProfileId(profileId) ||
      lead.profile_slug === String(profileId)
  );
}

function fallbackScans(profileId: string | number): DailyScan[] {
  return SEED_SCANS.filter(
    (scan) => normalizeProfileId(scan.profile_id) === normalizeProfileId(profileId)
  );
}
