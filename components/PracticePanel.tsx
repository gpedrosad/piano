"use client";

import type { PracticeGuide, PracticeItem } from "@/lib/music/practice";
import { scientificToSpanish } from "@/lib/music/midi";

type PracticePanelProps = {
  guide: PracticeGuide | null;
  activeId: string | null;
  onPlayItem: (item: PracticeItem) => void;
};

function noteList(notes: string[]): string {
  return notes
    .map((note) => scientificToSpanish(note, false).replace(" bemol", "♭"))
    .join(" · ");
}

function PracticeCard({
  item,
  active,
  onPlay,
}: {
  item: PracticeItem;
  active: boolean;
  onPlay: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPlay}
      aria-pressed={active}
      className={`rounded-lg border px-3 py-2 text-left transition-colors ${
        active
          ? "border-zinc-800 bg-zinc-800 text-white"
          : "border-zinc-300 bg-white text-zinc-900 hover:border-zinc-400 hover:bg-zinc-50"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{item.name}</span>
        <span
          className={`text-xs tabular-nums ${
            active ? "text-zinc-300" : "text-zinc-500"
          }`}
        >
          {noteList(item.notes)}
        </span>
      </div>
      <p className={`mt-1 text-xs ${active ? "text-zinc-300" : "text-zinc-500"}`}>
        {item.hint}
      </p>
    </button>
  );
}

export default function PracticePanel({
  guide,
  activeId,
  onPlayItem,
}: PracticePanelProps) {
  if (!guide) {
    return (
      <p className="text-sm text-zinc-500">
        Esta partitura todavía no tiene guía de acordes para la izquierda.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-sm font-medium text-zinc-900">
          Izquierda · {guide.title}
        </p>
        <p className="text-xs text-zinc-500">
          {guide.keyLabel} · {guide.rhythm}
        </p>
      </div>

      <div className="grid gap-2">
        {guide.chords.map((item) => (
          <PracticeCard
            key={item.id}
            item={item}
            active={activeId === item.id}
            onPlay={() => onPlayItem(item)}
          />
        ))}
      </div>

      <div>
        <p className="mb-1.5 text-[10px] tracking-wide text-zinc-500 uppercase">
          Pedales graves
        </p>
        <div className="flex flex-wrap gap-2">
          {guide.pedals.map((item) => {
            const active = activeId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onPlayItem(item)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  active
                    ? "border-zinc-800 bg-zinc-800 text-white"
                    : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400 hover:bg-zinc-50"
                }`}
              >
                {item.name}
                <span className={active ? "text-zinc-300" : "text-zinc-500"}>
                  {" "}
                  · {noteList(item.notes)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
