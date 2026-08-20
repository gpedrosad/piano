"use client";

import type { ChangeEvent, ReactNode } from "react";
import type { HandMode, PlaybackStatus } from "@/types/music";

type ScoreToolbarProps = {
  fileName: string | null;
  loading: boolean;
  currentMeasure: number;
  measureCount: number;
  tempo: number;
  handMode: HandMode;
  playbackStatus: PlaybackStatus;
  debug: boolean;
  onLoadFile: (file: File) => void;
  onLoadExample: () => void;
  onLoadGnossienne: () => void;
  rendering?: boolean;
  onMeasureChange: (measure: number) => void;
  onTempoChange: (tempo: number) => void;
  onHandModeChange: (mode: HandMode) => void;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onDebugChange: (debug: boolean) => void;
};

function ToolbarButton({
  children,
  onClick,
  disabled,
  active,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "border-zinc-800 bg-zinc-800 text-white"
          : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400 hover:bg-zinc-50"
      }`}
    >
      {children}
    </button>
  );
}

export default function ScoreToolbar({
  fileName,
  loading,
  currentMeasure,
  measureCount,
  tempo,
  handMode,
  playbackStatus,
  debug,
  onLoadFile,
  onLoadExample,
  onLoadGnossienne,
  rendering,
  onMeasureChange,
  onTempoChange,
  onHandModeChange,
  onPlay,
  onPause,
  onReset,
  onDebugChange,
}: ScoreToolbarProps) {
  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onLoadFile(file);
    event.target.value = "";
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50">
          Cargar MusicXML
          <input
            type="file"
            accept=".xml,.musicxml,.mxl,application/xml,text/xml"
            className="hidden"
            onChange={handleFile}
          />
        </label>
        <ToolbarButton onClick={onLoadGnossienne} disabled={loading || rendering}>
          Gnossienne No. 1
        </ToolbarButton>
        <ToolbarButton onClick={onLoadExample} disabled={loading || rendering}>
          Estudio corto
        </ToolbarButton>
        {fileName ? (
          <span className="text-sm text-zinc-500">{fileName}</span>
        ) : null}
        {loading || rendering ? (
          <span className="text-sm text-zinc-500">
            {rendering ? "Renderizando partitura…" : "Cargando…"}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ToolbarButton
          onClick={() => onMeasureChange(1)}
          disabled={measureCount === 0}
        >
          Primer compás
        </ToolbarButton>
        <ToolbarButton
          onClick={() => onMeasureChange(Math.max(1, currentMeasure - 1))}
          disabled={currentMeasure <= 1}
        >
          ◀ Anterior
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            onMeasureChange(Math.min(measureCount, currentMeasure + 1))
          }
          disabled={currentMeasure >= measureCount}
        >
          Siguiente ▶
        </ToolbarButton>
        <ToolbarButton
          onClick={() => onMeasureChange(measureCount)}
          disabled={measureCount === 0}
        >
          Último compás
        </ToolbarButton>
        <span className="ml-1 text-sm tabular-nums text-zinc-600">
          Compás {measureCount === 0 ? 0 : currentMeasure} / {measureCount}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ToolbarButton
          onClick={onPlay}
          disabled={measureCount === 0 || playbackStatus === "playing"}
          active={playbackStatus === "playing"}
        >
          Play
        </ToolbarButton>
        <ToolbarButton
          onClick={onPause}
          disabled={playbackStatus !== "playing"}
        >
          Pause
        </ToolbarButton>
        <ToolbarButton onClick={onReset} disabled={measureCount === 0}>
          Reset
        </ToolbarButton>
        <label className="ml-2 flex items-center gap-2 text-sm text-zinc-700">
          Tempo
          <input
            type="number"
            min={20}
            max={200}
            value={tempo}
            onChange={(event) => onTempoChange(Number(event.target.value) || 60)}
            className="w-16 rounded border border-zinc-300 bg-white px-2 py-1 text-sm tabular-nums"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ToolbarButton
          onClick={() => onHandModeChange("both")}
          active={handMode === "both"}
        >
          Mostrar ambas manos
        </ToolbarButton>
        <ToolbarButton
          onClick={() => onHandModeChange("right")}
          active={handMode === "right"}
        >
          Derecha
        </ToolbarButton>
        <ToolbarButton
          onClick={() => onHandModeChange("left")}
          active={handMode === "left"}
        >
          Izquierda
        </ToolbarButton>
        <label className="ml-auto flex items-center gap-2 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={debug}
            onChange={(event) => onDebugChange(event.target.checked)}
          />
          Debug
        </label>
      </div>
    </div>
  );
}
