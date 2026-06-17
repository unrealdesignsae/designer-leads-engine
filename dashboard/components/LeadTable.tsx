"use client";

import { Lead } from "@/lib/types";
import { useState, useCallback } from "react";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  selected: "bg-yellow-100 text-yellow-800",
  contacted: "bg-purple-100 text-purple-800",
  replied: "bg-indigo-100 text-indigo-800",
  interested: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  failed: "bg-gray-100 text-gray-800",
};

const CHANNEL_ICONS: Record<string, string> = {
  linkedin: "🔗",
  email: "📧",
  whatsapp: "💬",
};

interface LeadTableProps {
  leads: Lead[];
  onSelect: (ids: number[]) => void;
  onDispatch: (ids: number[]) => void;
  loading: boolean;
}

export default function LeadTable({ leads, onSelect, onDispatch, loading }: LeadTableProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggle = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    const selectable = leads.filter((l) => l.status === "new");
    if (selected.size === selectable.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectable.map((l) => l.id)));
    }
  }, [leads, selected]);

  if (!leads.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No leads yet</p>
        <p className="text-sm mt-1">Leads will appear here after the daily scan runs.</p>
      </div>
    );
  }

  const selectable = leads.filter((l) => l.status === "new");

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => onSelect(Array.from(selected))}
            disabled={selected.size === 0 || loading}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-yellow-700 transition"
          >
            Mark Selected ({selected.size})
          </button>
          <button
            onClick={() => onDispatch(Array.from(selected))}
            disabled={selected.size === 0 || loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-green-700 transition"
          >
            🚀 Send DMs ({selected.size})
          </button>
        </div>
        <span className="text-sm text-gray-500">
          {selectable.length} new · {leads.length} total
        </span>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3 w-10">
                <input
                  type="checkbox"
                  onChange={toggleAll}
                  checked={selected.size > 0 && selected.size === selectable.length}
                  className="rounded"
                />
              </th>
              <th className="p-3">Name</th>
              <th className="p-3">Role Seeking</th>
              <th className="p-3">Company</th>
              <th className="p-3">Location</th>
              <th className="p-3">Channels</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date</th>
              <th className="p-3">Link</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className={`border-t hover:bg-gray-50 ${
                  selected.has(lead.id) ? "bg-yellow-50" : ""
                }`}
              >
                <td className="p-3">
                  {lead.status === "new" && (
                    <input
                      type="checkbox"
                      checked={selected.has(lead.id)}
                      onChange={() => toggle(lead.id)}
                      className="rounded"
                    />
                  )}
                </td>
                <td className="p-3 font-medium">{lead.name || "Unknown"}</td>
                <td className="p-3">{lead.role_seeking || "—"}</td>
                <td className="p-3 text-gray-600">{lead.company || "—"}</td>
                <td className="p-3 text-gray-600">{lead.location || "—"}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    {(Array.isArray(lead.channels_available)
                      ? lead.channels_available
                      : ["linkedin"]
                    ).map((ch) => (
                      <span key={ch} title={ch} className="text-sm">
                        {CHANNEL_ICONS[ch] || "🔗"}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      STATUS_COLORS[lead.status] || "bg-gray-100"
                    }`}
                  >
                    {lead.status}
                  </span>
                </td>
                <td className="p-3 text-gray-500 text-xs">
                  {lead.post_date || lead.discovered_at?.slice(0, 10) || "—"}
                </td>
                <td className="p-3">
                  {lead.post_url && lead.post_url !== "N/A" ? (
                    <a
                      href={lead.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View →
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
