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
    const hide = window.setTimeout(() => setVisible(false), 2200);
    return () => window.clearTimeout(hide);
  }, [text, token]);

  if (!label) return null;

  return (
    <div
      aria-live="polite"
      className={`pointer-events-none fixed top-[max(3.35rem,calc(env(safe-area-inset-top)+2.85rem))] left-1/2 z-50 max-w-[min(92vw,36rem)] -translate-x-1/2 rounded-full bg-zinc-900 px-4 py-1.5 text-center text-base font-semibold tracking-wide text-white shadow-lg transition-opacity duration-300 landscape:text-xl ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {label}
    </div>
  );
}
