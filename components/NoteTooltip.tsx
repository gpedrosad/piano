"use client";

import type { TooltipState } from "@/types/music";

export default function NoteTooltip({ tooltip }: { tooltip: TooltipState }) {
  if (!tooltip) return null;

  return (
    <div
      className="pointer-events-none fixed z-50 rounded border border-zinc-300 bg-white px-2.5 py-1.5 text-xs shadow-sm"
      style={{
        left: tooltip.x + 12,
        top: tooltip.y + 12,
      }}
    >
      <div className="font-medium text-zinc-900">{tooltip.spanishName}</div>
      <div className="text-zinc-500">{tooltip.handLabel}</div>
    </div>
  );
}
