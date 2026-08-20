"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NoteInspector from "@/components/NoteInspector";
import NoteTooltip from "@/components/NoteTooltip";
import PianoKeyboard from "@/components/PianoKeyboard";
import ScoreToolbar from "@/components/ScoreToolbar";
import ScoreViewer from "@/components/ScoreViewer";
import { useMusicXml } from "@/hooks/useMusicXml";
import { usePianoAudio } from "@/hooks/usePianoAudio";
import { midiToSpanishNote, parseScientificNote, scientificToSpanish } from "@/lib/music/midi";
import type {
  HandMode,
  OsmdDebugInfo,
  PlaybackStatus,
  ScoreReadyInfo,
  SelectedNote,
  TooltipState,
} from "@/types/music";

export default function PianoScoreApp() {
  const { musicXml, fileName, error, loading, loadFile, loadExample, loadGnossienne } =
    useMusicXml();
  const { playNote, playNotes } = usePianoAudio();

  const [selectedNote, setSelectedNote] = useState<SelectedNote | null>(null);
  const [debugInfo, setDebugInfo] = useState<OsmdDebugInfo | null>(null);
  const [currentMeasure, setCurrentMeasure] = useState(0);
  const [measureCount, setMeasureCount] = useState(0);
  const [handMode, setHandMode] = useState<HandMode>("both");
  const [tempo, setTempo] = useState(54);
  const [debug, setDebug] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>("idle");
  const [playbackMidis, setPlaybackMidis] = useState<number[]>([]);
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const [title, setTitle] = useState<string | undefined>();
  const [rendering, setRendering] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const playbackStatusRef = useRef(playbackStatus);
  playbackStatusRef.current = playbackStatus;

  useEffect(() => {
    void loadGnossienne();
  }, [loadGnossienne]);

  const handleReady = useCallback((info: ScoreReadyInfo) => {
    setMeasureCount(info.measureCount);
    setTitle(info.title);
    setSelectedNote(null);
    setDebugInfo(null);
    setPlaybackStatus("idle");
    setPlaybackMidis([]);
  }, []);

  const handleSelectNote = useCallback(
    (note: SelectedNote, info?: OsmdDebugInfo) => {
      setSelectedNote(note);
      setDebugInfo(info ?? null);
      if (playbackStatusRef.current !== "playing") {
        void playNote(note.scientificName);
      }
    },
    [playNote],
  );

  const handlePlaybackNotes = useCallback(
    (notes: SelectedNote[]) => {
      setPlaybackMidis(notes.map((note) => note.midi));
      if (notes.length > 0) {
        void playNotes(notes.map((note) => note.scientificName));
      }
    },
    [playNotes],
  );

  const handlePianoClick = useCallback(
    (midi: number, scientificName: string) => {
      const parsed = parseScientificNote(scientificName);
      const note: SelectedNote = {
        scientificName,
        spanishName: midiToSpanishNote(midi) || scientificToSpanish(scientificName),
        midi,
        octave: parsed?.octave ?? Math.floor(midi / 12) - 1,
        measure: currentMeasure || 0,
        staff: 0,
        hand: "unknown",
      };
      setSelectedNote(note);
      setDebugInfo(null);
      void playNote(scientificName);
    },
    [currentMeasure, playNote],
  );

  const activeMidis = useMemo(() => {
    const values = [...playbackMidis];
    if (selectedNote) values.push(selectedNote.midi);
    return Array.from(new Set(values));
  }, [playbackMidis, selectedNote]);

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-zinc-100 text-zinc-900">
      <header className="shrink-0 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col px-6">
          <div className="flex items-center justify-between gap-3 py-2">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              className="flex min-w-0 items-center gap-3 text-left"
            >
              <span className="text-sm font-medium tracking-tight">
                Piano Score
              </span>
              {title ? (
                <span className="truncate text-sm text-zinc-500">{title}</span>
              ) : null}
              <span className="rounded border border-zinc-300 px-2 py-0.5 text-xs text-zinc-600">
                {menuOpen ? "Cerrar menú" : "Menú"}
              </span>
            </button>
            {!menuOpen && measureCount > 0 ? (
              <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                Compás {currentMeasure} / {measureCount}
              </span>
            ) : null}
          </div>
          {menuOpen ? (
            <div className="border-t border-zinc-200 py-3">
              <ScoreToolbar
                fileName={fileName}
                loading={loading}
                currentMeasure={currentMeasure}
                measureCount={measureCount}
                tempo={tempo}
                handMode={handMode}
                playbackStatus={playbackStatus}
                debug={debug}
                onLoadFile={loadFile}
                onLoadExample={loadExample}
                onLoadGnossienne={loadGnossienne}
                rendering={rendering}
                onMeasureChange={setCurrentMeasure}
                onTempoChange={setTempo}
                onHandModeChange={setHandMode}
                onPlay={() => setPlaybackStatus("playing")}
                onPause={() => setPlaybackStatus("paused")}
                onReset={() => setPlaybackStatus("idle")}
                onDebugChange={setDebug}
              />
              {error ? (
                <p className="mt-2 text-sm text-red-700">{error}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-6 py-3">
        <section className="relative min-h-0 flex-1 overflow-auto overscroll-contain rounded border border-zinc-200 bg-white p-4">
          {rendering ? (
            <p className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-sm text-zinc-500">
              Renderizando partitura…
            </p>
          ) : null}
          {musicXml ? (
            <ScoreViewer
              musicXml={musicXml}
              currentMeasure={currentMeasure}
              handMode={handMode}
              debug={debug}
              playbackStatus={playbackStatus}
              tempo={tempo}
              onSelectNote={handleSelectNote}
              onMeasureChange={setCurrentMeasure}
              onReady={handleReady}
              onTooltip={setTooltip}
              onPlaybackStatusChange={setPlaybackStatus}
              onPlaybackNotes={handlePlaybackNotes}
              onRenderingChange={setRendering}
            />
          ) : (
            <p className="px-6 py-20 text-center text-sm text-zinc-500">
              Carga un MusicXML o pulsa “Gnossienne No. 1” para estudiar la
              partitura.
            </p>
          )}
        </section>
      </main>

      <footer className="shrink-0 border-t border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-3">
          <NoteInspector
            note={selectedNote}
            debug={debug}
            debugInfo={debugInfo}
            compact
          />
          <PianoKeyboard
            startMidi={33}
            endMidi={84}
            selectedMidi={selectedNote?.midi ?? null}
            activeMidis={activeMidis}
            onKeyClick={handlePianoClick}
          />
        </div>
      </footer>

      <NoteTooltip tooltip={tooltip} />
    </div>
  );
}
