"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProfiles } from "@/lib/profiles";

interface ScanConfig {
  target_count: number;
  min_quality: number;
  recency_days: number;
  must_include: string;
  must_exclude: string;
  score_with_llm: boolean;
  require_email: boolean;
  require_linkedin: boolean;
  require_phone: boolean;
}

const DEFAULTS: ScanConfig = {
  target_count: 20,
  min_quality: 1,
  recency_days: 365,
  must_include: "",
  must_exclude: "",
  score_with_llm: true,
  require_email: false,
  require_linkedin: false,
  require_phone: false,
};

const RECENCY_OPTIONS = [
  { label: "Last 7 days", value: 7 },
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
  { label: "Last year", value: 365 },
  { label: "All time", value: 9999 },
];

interface ScanModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ScanModal({ open, onClose }: ScanModalProps) {
  const { activeProfile } = useProfiles();
  const [config, setConfig] = useState<ScanConfig>(DEFAULTS);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<{ message?: string; scan_id?: string | null } | null>(null);

  function set<K extends keyof ScanConfig>(key: K, value: ScanConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  async function handleRun() {
    setStatus("loading");
    setResult(null);
    try {
      const payload = {
        profile_id: String(activeProfile.id),
        target_count: config.target_count,
        min_quality: config.min_quality,
        recency_days: config.recency_days,
        must_include: config.must_include ? config.must_include.split(",").map((s) => s.trim()).filter(Boolean) : [],
        must_exclude: config.must_exclude ? config.must_exclude.split(",").map((s) => s.trim()).filter(Boolean) : [],
        score_with_llm: config.score_with_llm,
        require_email: config.require_email,
        require_linkedin: config.require_linkedin,
        require_phone: config.require_phone,
      };
      const res = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setResult(data);
      setStatus("done");
    } catch {
      setStatus("error");
      setResult({ message: "Request failed. Check network." });
    }
  }

  function handleClose() {
    setStatus("idle");
    setResult(null);
    onClose();
  }

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
            className="relative w-full max-w-lg border border-border rounded-2xl bg-bg-primary p-6 shadow-2xl"
          >
            <code className="mono-label block mb-1">scan</code>
            <h2 className="text-xl font-light text-text-primary mb-1">Run scan</h2>
            <p className="text-xs text-text-muted mb-6">
              Profile: <span className="text-text-secondary font-medium">{activeProfile.name}</span>
              <span className="ml-3 text-text-dim">Results land in Leads after Hermes executes.</span>
            </p>

            <div className="space-y-5">
              {/* Target count */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2">
                  Target leads <span className="text-text-dim font-mono ml-1">{config.target_count}</span>
                </label>
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={config.target_count}
                  onChange={(e) => set("target_count", Number(e.target.value))}
                  className="w-full accent-green"
                />
                <div className="flex justify-between text-[10px] font-mono text-text-dim mt-1">
                  <span>5</span><span>50</span><span>100</span>
                </div>
              </div>

              {/* Min quality */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2">
                  Min quality rating
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set("min_quality", n)}
                      className={[
                        "flex-1 py-1.5 rounded-md border text-xs font-mono transition-colors",
                        config.min_quality === n
                          ? "border-green bg-green/10 text-green"
                          : "border-border text-text-dim hover:border-border-hover",
                      ].join(" ")}
                    >
                      {n}★
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-text-dim mt-1.5">
                  {config.min_quality === 1 ? "Keep all leads regardless of fit" : config.min_quality >= 4 ? "High-quality only — fewer results, better fit" : "Moderate filter — balanced"}
                </p>
              </div>

              {/* Recency */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2">Posted within</label>
                <div className="flex flex-wrap gap-2">
                  {RECENCY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set("recency_days", opt.value)}
                      className={[
                        "px-3 py-1 rounded-md border text-xs transition-colors",
                        config.recency_days === opt.value
                          ? "border-green bg-green/10 text-green"
                          : "border-border text-text-dim hover:border-border-hover",
                      ].join(" ")}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact requirement */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2">
                  Require contact info in post
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "require_email" as const, label: "Has email" },
                    { key: "require_linkedin" as const, label: "Has LinkedIn" },
                    { key: "require_phone" as const, label: "Has phone" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => set(opt.key, !config[opt.key])}
                      className={[
                        "px-3 py-1.5 rounded-md border text-xs transition-colors",
                        config[opt.key]
                          ? "border-green bg-green/10 text-green"
                          : "border-border text-text-dim hover:border-border-hover",
                      ].join(" ")}
                    >
                      {config[opt.key] ? "✓ " : ""}{opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-text-dim mt-1.5">
                  Only keep leads that have visible contact details in their post.
                </p>
              </div>

              {/* Keywords */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Must include</label>
                  <input
                    type="text"
                    placeholder="e.g. hiring, freelance"
                    value={config.must_include}
                    onChange={(e) => set("must_include", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-green"
                  />
                  <p className="text-[10px] text-text-dim mt-1">comma-separated</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Must exclude</label>
                  <input
                    type="text"
                    placeholder="e.g. junior, intern"
                    value={config.must_exclude}
                    onChange={(e) => set("must_exclude", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-green"
                  />
                  <p className="text-[10px] text-text-dim mt-1">comma-separated</p>
                </div>
              </div>

              {/* LLM scoring toggle */}
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-xs font-medium text-text-secondary">Claude fit scoring</p>
                  <p className="text-[10px] text-text-dim">Rates each lead 1-5 before insert. Slower, smarter.</p>
                </div>
                <div
                  onClick={() => set("score_with_llm", !config.score_with_llm)}
                  className={[
                    "w-10 h-5 rounded-full transition-colors flex items-center px-0.5 cursor-pointer",
                    config.score_with_llm ? "bg-green" : "bg-border",
                  ].join(" ")}
                >
                  <div className={["w-4 h-4 rounded-full bg-white shadow transition-transform", config.score_with_llm ? "translate-x-5" : "translate-x-0"].join(" ")} />
                </div>
              </label>
            </div>

            {/* Result */}
            {result ? (
              <div className={["mt-5 rounded-lg border p-3 text-xs", status === "error" ? "border-red-500/30 bg-red-500/5 text-red-400" : "border-green-border bg-green/5 text-text-secondary"].join(" ")}>
                {result.message}
                {result.scan_id ? <span className="ml-2 font-mono text-text-dim">#{result.scan_id}</span> : null}
              </div>
            ) : null}

            {/* Actions */}
            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-lg border border-border text-xs text-text-secondary hover:border-border-hover transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleRun}
                disabled={status === "loading"}
                className="px-5 py-2 rounded-lg bg-green text-black text-xs font-medium disabled:opacity-50 transition-opacity"
              >
                {status === "loading" ? "Queuing…" : status === "done" ? "Queued" : "Run scan"}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
