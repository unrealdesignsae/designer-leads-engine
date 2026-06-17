"use client";

import { motion } from "framer-motion";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-border animate-pulse rounded-md ${className}`} />;
}

export function SkeletonCard() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-5 border border-border rounded-lg bg-surface"
    >
      <div className="h-3 w-20 bg-border rounded-pill animate-pulse mb-3" />
      <div className="h-7 w-16 bg-border rounded-pill animate-pulse mb-2" />
      <div className="h-3 w-12 bg-border-subtle rounded-pill animate-pulse" />
    </motion.div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-3 border-t border-border-subtle">
      <div className="w-4 h-4 rounded-sm bg-border animate-pulse flex-shrink-0" />
      <div className="h-4 w-32 bg-border rounded-pill animate-pulse" />
      <div className="h-4 w-24 bg-border rounded-pill animate-pulse hidden sm:block" />
      <div className="h-4 w-20 bg-border rounded-pill animate-pulse hidden sm:block" />
      <div className="h-4 w-16 bg-border-subtle rounded-pill animate-pulse ml-auto" />
    </div>
  );
}

export function SkeletonTable() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="border border-border rounded-lg overflow-hidden"
    >
      <div className="flex items-center gap-3 p-3 border-b border-border bg-surface">
        <div className="w-4 h-4 rounded-sm bg-border animate-pulse" />
        <div className="h-3 w-16 bg-border rounded-pill animate-pulse" />
        <div className="h-3 w-24 bg-border rounded-pill animate-pulse" />
        <div className="h-3 w-20 bg-border rounded-pill animate-pulse hidden sm:block" />
        <div className="h-3 w-16 bg-border-subtle rounded-pill animate-pulse ml-auto" />
      </div>
      {[...Array(4)].map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </motion.div>
  );
}