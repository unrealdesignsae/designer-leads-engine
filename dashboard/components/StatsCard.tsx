"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface StatsCardProps {
  label: string;
  value: number;
  unit: string;
  index: number;
  accent?: string;
}

export default function StatsCard({ label, value, unit, index, accent }: StatsCardProps) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    const from = previous.current;
    const to = value;
    previous.current = value;

    if (from === to) {
      setDisplay(to);
      return;
    }

    const start = performance.now();
    const duration = 600;
    let frame = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="p-5 border border-border rounded-lg bg-surface
                 hover:border-border-prominent transition-colors duration-200
                 group cursor-default"
    >
      <code className="mono-label mb-2 block group-hover:text-text-secondary transition-colors">
        {label}
      </code>
      <p className="text-2xl sm:text-3xl font-light text-text-primary tabular-nums tracking-tight">
        {display}
      </p>
      <p className="text-xs text-text-muted mt-1">{unit}</p>

      <div
        className="mt-3 h-0.5 rounded-pill transition-all duration-300 group-hover:w-full"
        style={{
          width: accent ? "40%" : "0%",
          background: accent || "var(--color-border)",
        }}
      />
    </motion.div>
  );
}
