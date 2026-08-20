"use client";

import type { OsmdDebugInfo, SelectedNote } from "@/types/music";

type NoteInspectorProps = {
  notes: SelectedNote[];
  debug: boolean;
  debugInfo: OsmdDebugInfo | null;
  compact?: boolean;
};

function handLabel(hand: SelectedNote["hand"]): string {
  if (hand === "right") return "Mano derecha";
  if (hand === "left") return "Mano izquierda";
  return "Mano desconocida";
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] tracking-wide text-zinc-500 uppercase">
        {label}
      </span>
      <span className="text-sm font-medium text-zinc-900">{value}</span>
    </div>
  );
}

export default function NoteInspector({
  notes,
  debug,
  debugInfo,
  compact = false,
}: NoteInspectorProps) {
  const note = notes[0] ?? null;
  const sorted = [...notes].sort((a, b) => a.midi - b.midi);
  const names = sorted.map((item) => item.spanishName).join(" · ");
  const scientific = sorted.map((item) => item.scientificName).join(" · ");

  if (compact) {
    return (
      <section className="min-w-0">
        {note ? (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <p className="text-base font-medium tracking-tight text-zinc-900 landscape:text-lg">
              {names}
            </p>
            <span className="text-xs text-zinc-500">
              {scientific} · Compás {note.measure}
              {notes.length === 1 && note.duration ? ` · ${note.duration}` : ""}
            </span>
          </div>
        ) : (
          <p className="text-xs text-zinc-500">Selecciona una nota</p>
        )}
        {debug && debugInfo ? (
          <pre className="mt-1 max-h-16 overflow-auto rounded border border-zinc-200 bg-zinc-50 p-2 text-[11px] text-zinc-700">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        ) : null}
      </section>
    );
  }

  if (!note) {
    return (
      <section className="rounded border border-zinc-200 bg-white p-5">
        <h2 className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
          Nota seleccionada
        </h2>
        <p className="mt-4 text-sm text-zinc-500">
          Selecciona una nota del pentagrama
        </p>
      </section>
    );
  }

  return (
    <section className="rounded border border-zinc-200 bg-white p-5">
      <h2 className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
        Nota seleccionada
      </h2>
      <p className="mt-3 font-sans text-3xl tracking-tight text-zinc-900">
        {names}
      </p>
      <dl className="mt-5 space-y-2 text-sm">
        <div className="grid grid-cols-[140px_1fr] gap-3">
          <dt className="text-zinc-500">Nombre internacional</dt>
          <dd className="font-medium text-zinc-900">{scientific}</dd>
        </div>
        <div className="grid grid-cols-[140px_1fr] gap-3">
          <dt className="text-zinc-500">MIDI</dt>
          <dd className="font-medium text-zinc-900">{note.midi}</dd>
        </div>
        <div className="grid grid-cols-[140px_1fr] gap-3">
          <dt className="text-zinc-500">Octava</dt>
          <dd className="font-medium text-zinc-900">{note.octave}</dd>
        </div>
        <div className="grid grid-cols-[140px_1fr] gap-3">
          <dt className="text-zinc-500">Mano</dt>
          <dd className="font-medium text-zinc-900">{handLabel(note.hand)}</dd>
        </div>
        <div className="grid grid-cols-[140px_1fr] gap-3">
          <dt className="text-zinc-500">Pentagrama</dt>
          <dd className="font-medium text-zinc-900">{note.staff + 1}</dd>
        </div>
        <div className="grid grid-cols-[140px_1fr] gap-3">
          <dt className="text-zinc-500">Compás</dt>
          <dd className="font-medium text-zinc-900">{note.measure}</dd>
        </div>
        <div className="grid grid-cols-[140px_1fr] gap-3">
          <dt className="text-zinc-500">Duración</dt>
          <dd className="font-medium text-zinc-900">{note.duration ?? "—"}</dd>
        </div>
      </dl>
      {debug && debugInfo ? (
        <pre className="mt-5 max-h-64 overflow-auto rounded border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      ) : null}
    </section>
  );
}
