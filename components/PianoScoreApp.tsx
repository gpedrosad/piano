"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NoteFlash from "@/components/NoteFlash";
import NoteInspector from "@/components/NoteInspector";
import NoteTooltip from "@/components/NoteTooltip";
import PianoKeyboard from "@/components/PianoKeyboard";
import ScoreToolbar from "@/components/ScoreToolbar";
import ScoreViewer, { type NoteStepRequest } from "@/components/ScoreViewer";
import { useMusicXml } from "@/hooks/useMusicXml";
import { usePianoAudio } from "@/hooks/usePianoAudio";
import {
  midiToSpanishNote,
  notesAnnouncementLabel,
  parseScientificNote,
  scientificToSpanish,
} from "@/lib/music/midi";
import type {
  HandMode,
  OsmdDebugInfo,
  PlaybackStatus,
  ScoreReadyInfo,
  SelectedNote,
  TooltipState,
} from "@/types/music";

function uniqueSelectedNotes(notes: SelectedNote[]): SelectedNote[] {
  const seen = new Set<number>();
  const unique: SelectedNote[] = [];
  for (const note of [...notes].sort((a, b) => a.midi - b.midi)) {
    if (seen.has(note.midi)) continue;
    seen.add(note.midi);
    unique.push(note);
  }
  return unique;
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {open ? (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6L6 18" />
        </>
      ) : (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </>
      )}
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: "prev" | "next" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {direction === "prev" ? (
        <path d="M15 6l-6 6 6 6" />
      ) : (
        <path d="M9 6l6 6-6 6" />
      )}
    </svg>
  );
}

export default function PianoScoreApp() {
  const { musicXml, fileName, error, loading, loadFile, loadExample, loadGnossienne } =
    useMusicXml();
  const { playNote, playNotes } = usePianoAudio();

  const [selectedNotes, setSelectedNotes] = useState<SelectedNote[]>([]);
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
  const [noteStep, setNoteStep] = useState<NoteStepRequest | null>(null);
  const [flash, setFlash] = useState<{ text: string | null; token: number }>({
    text: null,
    token: 0,
  });

  const playbackStatusRef = useRef(playbackStatus);
  playbackStatusRef.current = playbackStatus;

  useEffect(() => {
    void loadGnossienne();
  }, [loadGnossienne]);

  const announceNotes = useCallback((notes: SelectedNote[]) => {
    if (notes.length === 0) return;
    setFlash((current) => ({
      text: notesAnnouncementLabel(notes),
      token: current.token + 1,
    }));
  }, []);

  const handleReady = useCallback((info: ScoreReadyInfo) => {
    setMeasureCount(info.measureCount);
    setTitle(info.title);
    setSelectedNotes([]);
    setDebugInfo(null);
    setPlaybackStatus("idle");
    setPlaybackMidis([]);
  }, []);

  const handleSelectNote = useCallback(
    (notes: SelectedNote[], info?: OsmdDebugInfo) => {
      const unique = uniqueSelectedNotes(notes);
      setSelectedNotes(unique);
      setDebugInfo(info ?? null);
      if (playbackStatusRef.current !== "playing") {
        void playNotes(unique.map((note) => note.scientificName));
        announceNotes(unique);
      }
    },
    [announceNotes, playNotes],
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
      setSelectedNotes([note]);
      setDebugInfo(null);
      void playNote(scientificName);
      announceNotes([note]);
    },
    [announceNotes, currentMeasure, playNote],
  );

  const stepNote = useCallback((direction: -1 | 1) => {
    setNoteStep((current) => ({
      id: (current?.id ?? 0) + 1,
      direction,
    }));
  }, []);

  const activeMidis = useMemo(() => {
    const values = [...playbackMidis];
    if (selectedNotes.length > 0) {
      values.push(...selectedNotes.map((note) => note.midi));
    }
    return Array.from(new Set(values));
  }, [playbackMidis, selectedNotes]);

  return (
    <div className="app-shell relative flex h-dvh min-h-0 flex-col overflow-hidden bg-zinc-100 text-zinc-900">
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-expanded={menuOpen}
        aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
        className="absolute top-[max(0.5rem,env(safe-area-inset-top))] left-[max(0.5rem,env(safe-area-inset-left))] z-40 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-white/90 text-zinc-800 shadow-sm"
      >
        <MenuIcon open={menuOpen} />
      </button>

      <div className="absolute top-[max(0.5rem,env(safe-area-inset-top))] left-[max(3.25rem,calc(env(safe-area-inset-left)+2.75rem))] z-40 flex gap-1">
        <button
          type="button"
          onClick={() => stepNote(-1)}
          disabled={!musicXml}
          aria-label="Nota anterior"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-white/90 text-zinc-800 shadow-sm disabled:opacity-40"
        >
          <ChevronIcon direction="prev" />
        </button>
        <button
          type="button"
          onClick={() => stepNote(1)}
          disabled={!musicXml}
          aria-label="Nota siguiente"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-white/90 text-zinc-800 shadow-sm disabled:opacity-40"
        >
          <ChevronIcon direction="next" />
        </button>
      </div>

      <NoteFlash text={flash.text} token={flash.token} />

      {menuOpen ? (
        <>
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 z-20 bg-zinc-900/20"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-x-0 top-0 z-30 max-h-[min(70dvh,420px)] overflow-auto border-b border-zinc-200 bg-white pt-14 shadow-sm landscape:max-h-[85dvh]">
            <div className="px-4 pb-4">
              <p className="mb-3 truncate text-sm text-zinc-500">
                {title ?? "Piano Score"}
              </p>
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
          </div>
        </>
      ) : null}

      <main className="flex min-h-0 flex-1 flex-col">
        <section className="relative min-h-0 flex-1 overflow-auto overscroll-contain bg-white">
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
              noteStep={noteStep}
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

      <footer className="piano-dock shrink-0 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="flex flex-col gap-0.5 px-2 pt-0.5 sm:px-4 sm:pt-1">
          <NoteInspector
            notes={selectedNotes}
            debug={debug}
            debugInfo={debugInfo}
            compact
          />
          <div className="piano-frame">
            <PianoKeyboard
              startMidi={33}
              endMidi={84}
              selectedMidi={selectedNotes[0]?.midi ?? null}
              activeMidis={activeMidis}
              onKeyClick={handlePianoClick}
            />
          </div>
        </div>
      </footer>

      <NoteTooltip tooltip={tooltip} />
    </div>
  );
}
