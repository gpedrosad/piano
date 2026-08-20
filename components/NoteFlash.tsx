"use client";

import { useEffect, useState } from "react";

type NoteFlashProps = {
  text: string | null;
  token: number;
};

export default function NoteFlash({ text, token }: NoteFlashProps) {
  const [label, setLabel] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!text || token === 0) return;
    setLabel(text);
    setVisible(true);
    const hide = window.setTimeout(() => setVisible(false), 1400);
    return () => window.clearTimeout(hide);
  }, [text, token]);

  if (!label) return null;

  return (
    <div
      aria-live="polite"
      className={`pointer-events-none absolute top-[max(0.55rem,env(safe-area-inset-top))] left-1/2 z-40 max-w-[min(72vw,34rem)] -translate-x-1/2 rounded-full border border-zinc-200 bg-white/90 px-3 py-1 text-center text-sm font-medium tracking-wide text-zinc-900 shadow-sm transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {label}
    </div>
  );
}
