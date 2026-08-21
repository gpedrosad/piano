"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  applyHandMode,
  asVexNote,
  autoFitZoom,
  collectGraphicalNotes,
  createOsmd,
  debugInfoFromGraphicalNote,
  findNearestNote,
  getMeasureCount,
  graphicalNoteToSelected,
  scorePrefersFlats,
  highlightMeasure,
  highlightNotes,
  isNoteInHandMode,
  notesAtSameMoment,
  notesMatch,
  notesSharePlaybackAttack,
  ownNotehead,
  indexOfPlayableNote,
  playableNotesInOrder,
  scrollNoteIntoView,
  setCursorToMeasure,
  stepToPlayableNote,
  waitMsBetweenNotes,
  type InteractiveGraphicalNote,
} from "@/lib/music/osmd";
import type {
  HandMode,
  OsmdDebugInfo,
  PlaybackStatus,
  ScoreReadyInfo,
  SelectedNote,
  TooltipState,
} from "@/types/music";
import type { GraphicalNote, OpenSheetMusicDisplay } from "opensheetmusicdisplay";

export type NoteStepRequest = {
  id: number;
  direction: -1 | 1;
};

type ScoreViewerProps = {
  musicXml: string;
  currentMeasure: number;
  handMode: HandMode;
  debug: boolean;
  playbackStatus: PlaybackStatus;
  tempo: number;
  noteStep?: NoteStepRequest | null;
  onSelectNote: (notes: SelectedNote[], debugInfo?: OsmdDebugInfo) => void;
  onMeasureChange: (measure: number) => void;
  onReady: (info: ScoreReadyInfo) => void;
  onTooltip: Dispatch<SetStateAction<TooltipState>>;
  onPlaybackStatusChange: (status: PlaybackStatus) => void;
  onPlaybackNotes: (notes: SelectedNote[]) => void;
  onRenderingChange?: (rendering: boolean) => void;
};

export default function ScoreViewer({
  musicXml,
  currentMeasure,
  handMode,
  debug,
  playbackStatus,
  tempo,
  noteStep,
  onSelectNote,
  onMeasureChange,
  onReady,
  onTooltip,
  onPlaybackStatusChange,
  onPlaybackNotes,
  onRenderingChange,
}: ScoreViewerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const notesRef = useRef<InteractiveGraphicalNote[]>([]);
  const selectedGraphicalRef = useRef<GraphicalNote | null>(null);
  const selectedGroupRef = useRef<GraphicalNote[]>([]);
  const listenersRef = useRef<Array<() => void>>([]);
  const playbackTimerRef = useRef<number | null>(null);
  const playbackIndexRef = useRef(0);
  const lastWidthRef = useRef(0);
  const skipMeasureSyncRef = useRef(false);
  const currentMeasureRef = useRef(currentMeasure);
  const playbackStatusRef = useRef(playbackStatus);
  const tempoRef = useRef(tempo);
  const handModeRef = useRef(handMode);
  const debugRef = useRef(debug);

  currentMeasureRef.current = currentMeasure;
  playbackStatusRef.current = playbackStatus;
  tempoRef.current = tempo;
  handModeRef.current = handMode;
  debugRef.current = debug;

  const callbacksRef = useRef({
    onSelectNote,
    onMeasureChange,
    onReady,
    onTooltip,
    onPlaybackStatusChange,
    onPlaybackNotes,
    onRenderingChange,
  });
  callbacksRef.current = {
    onSelectNote,
    onMeasureChange,
    onReady,
    onTooltip,
    onPlaybackStatusChange,
    onPlaybackNotes,
    onRenderingChange,
  };

  const clearListeners = useCallback(() => {
    listenersRef.current.forEach((off) => off());
    listenersRef.current = [];
  }, []);

  const stopPlaybackTimer = useCallback(() => {
    if (playbackTimerRef.current !== null) {
      window.clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
  }, []);

  const selectGraphicalNotes = useCallback(
    (
      gNotes: GraphicalNote[],
      anchor: GraphicalNote,
      includeDebugInfo = false,
    ) => {
      const selected = gNotes
        .map((gNote) => graphicalNoteToSelected(gNote))
        .filter((note): note is SelectedNote => note !== null);
      if (selected.length === 0) return;

      selectedGraphicalRef.current = anchor;
      selectedGroupRef.current = gNotes;
      highlightNotes(notesRef.current, selectedGroupRef.current);
      callbacksRef.current.onSelectNote(
        selected,
        includeDebugInfo && debugRef.current
          ? debugInfoFromGraphicalNote(anchor)
          : undefined,
      );
      const measure = selected[0].measure;
      if (measure !== currentMeasureRef.current) {
        skipMeasureSyncRef.current = true;
        callbacksRef.current.onMeasureChange(measure);
      }
    },
    [],
  );

  const selectGraphicalNote = useCallback(
    (gNote: GraphicalNote) => {
      selectGraphicalNotes([gNote], gNote, true);
    },
    [selectGraphicalNotes],
  );

  useEffect(() => {
    if (!noteStep) return;
    const container = hostRef.current;
    const nextNote = stepToPlayableNote(
      notesRef.current,
      selectedGraphicalRef.current,
      noteStep.direction,
      handModeRef.current,
    );
    if (!nextNote) return;
    const group = notesAtSameMoment(
      notesRef.current,
      nextNote,
      handModeRef.current,
    );
    selectGraphicalNotes(group.length > 0 ? group : [nextNote], nextNote, true);
    if (container) scrollNoteIntoView(nextNote, container);
  }, [noteStep, selectGraphicalNotes]);

  const attachNoteListeners = useCallback(
    (osmd: OpenSheetMusicDisplay, container: HTMLElement) => {
      clearListeners();
      const notes = collectGraphicalNotes(osmd);
      notesRef.current = notes;

      for (const gNote of notes) {
        if (gNote.sourceNote?.isRest() || !gNote.sourceNote?.Pitch) continue;
        const vex = asVexNote(gNote);
        const targets: Element[] = [];
        const head = ownNotehead(gNote);
        if (head) targets.push(head);
        const group = vex?.getSVGGElement?.();
        if (targets.length === 0 && group instanceof Element) {
          targets.push(group);
        }

        const onClick = (event: Event) => {
          event.stopPropagation();
          selectGraphicalNote(gNote);
        };
        const onEnter = (event: Event) => {
          const mouse = event as MouseEvent;
          const selected = graphicalNoteToSelected(gNote);
          if (!selected) return;
          callbacksRef.current.onTooltip({
            x: mouse.clientX,
            y: mouse.clientY,
            spanishName: selected.spanishName,
            handLabel:
              selected.hand === "right"
                ? "Mano derecha"
                : selected.hand === "left"
                  ? "Mano izquierda"
                  : "Mano desconocida",
          });
        };
        const onMove = (event: Event) => {
          const mouse = event as MouseEvent;
          callbacksRef.current.onTooltip((current) =>
            current
              ? { ...current, x: mouse.clientX, y: mouse.clientY }
              : current,
          );
        };
        const onLeave = () => callbacksRef.current.onTooltip(null);

        for (const target of targets) {
          (target as HTMLElement).style.cursor = "pointer";
          target.addEventListener("click", onClick);
          target.addEventListener("mouseenter", onEnter);
          target.addEventListener("mousemove", onMove);
          target.addEventListener("mouseleave", onLeave);
          listenersRef.current.push(() => {
            target.removeEventListener("click", onClick);
            target.removeEventListener("mouseenter", onEnter);
            target.removeEventListener("mousemove", onMove);
            target.removeEventListener("mouseleave", onLeave);
          });
        }
      }

      const onContainerClick = (event: MouseEvent) => {
        const nearest = findNearestNote(osmd, container, event);
        if (nearest) selectGraphicalNote(nearest);
      };
      container.addEventListener("click", onContainerClick);
      listenersRef.current.push(() => {
        container.removeEventListener("click", onContainerClick);
      });

      applyHandMode(notes, handModeRef.current);
      const current = selectedGraphicalRef.current;
      if (current) {
        const rematched =
          notes.find((note) => notesMatch(note, current)) ?? current;
        selectedGraphicalRef.current = rematched;
        selectedGroupRef.current = [rematched];
        highlightNotes(notes, selectedGroupRef.current);
      }
    },
    [clearListeners, selectGraphicalNote],
  );

  const renderScore = useCallback(async () => {
    const container = hostRef.current;
    if (!container || !musicXml) return;

    callbacksRef.current.onRenderingChange?.(true);
    stopPlaybackTimer();
    clearListeners();
    selectedGraphicalRef.current = null;
    selectedGroupRef.current = [];
    container.replaceChildren();
    osmdRef.current = createOsmd(container);

    try {
      const osmd = osmdRef.current;
      await osmd.load(musicXml);
      autoFitZoom(osmd, container);
      osmd.cursor?.hide();
      attachNoteListeners(osmd, container);

      lastWidthRef.current = container.clientWidth;
      const measureCount = getMeasureCount(osmd);
      callbacksRef.current.onReady({
        measureCount,
        title: osmd.Sheet?.TitleString || undefined,
        preferFlat: scorePrefersFlats(osmd),
      });
      skipMeasureSyncRef.current = true;
      callbacksRef.current.onMeasureChange(1);
      highlightMeasure(container, osmd, 1);
    } catch (err) {
      console.error(err);
      container.textContent =
        err instanceof Error
          ? `No se pudo renderizar la partitura: ${err.message}`
          : "No se pudo renderizar la partitura";
    } finally {
      callbacksRef.current.onRenderingChange?.(false);
    }
  }, [attachNoteListeners, clearListeners, musicXml, stopPlaybackTimer]);

  useEffect(() => {
    void renderScore();
  }, [renderScore]);

  useEffect(() => {
    const container = hostRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      const osmd = osmdRef.current;
      const host = hostRef.current;
      if (!osmd || !host) return;
      const width = host.clientWidth;
      if (Math.abs(width - lastWidthRef.current) < 12) return;
      lastWidthRef.current = width;
      autoFitZoom(osmd, host);
      attachNoteListeners(osmd, host);
      highlightMeasure(host, osmd, currentMeasureRef.current);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [attachNoteListeners]);

  useEffect(() => {
    return () => {
      stopPlaybackTimer();
      clearListeners();
    };
  }, [clearListeners, stopPlaybackTimer]);

  useEffect(() => {
    if (notesRef.current.length === 0) return;
    applyHandMode(notesRef.current, handMode);
    if (selectedGraphicalRef.current) {
      selectGraphicalNote(selectedGraphicalRef.current);
    }
  }, [handMode, selectGraphicalNote]);

  useEffect(() => {
    const osmd = osmdRef.current;
    const container = hostRef.current;
    if (!osmd || !container || currentMeasure < 1) return;
    highlightMeasure(container, osmd, currentMeasure);
    if (skipMeasureSyncRef.current) {
      skipMeasureSyncRef.current = false;
      return;
    }
    if (playbackStatusRef.current === "playing") return;
    setCursorToMeasure(osmd, currentMeasure);
  }, [currentMeasure]);

  const stepPlaybackRef = useRef<() => void>(() => undefined);

  stepPlaybackRef.current = () => {
    const osmd = osmdRef.current;
    if (!osmd) return;
    if (playbackStatusRef.current !== "playing") return;

    const ordered = playableNotesInOrder(notesRef.current).filter((note) =>
      isNoteInHandMode(note, handModeRef.current),
    );
    if (ordered.length === 0) {
      callbacksRef.current.onPlaybackStatusChange("idle");
      return;
    }

    let index = playbackIndexRef.current;
    if (index < 0) {
      const fromSelected = indexOfPlayableNote(
        ordered,
        selectedGraphicalRef.current,
      );
      index = fromSelected >= 0 ? fromSelected : 0;
    }

    if (index >= ordered.length) {
      osmd.cursor?.reset();
      osmd.cursor?.hide();
      playbackIndexRef.current = 0;
      callbacksRef.current.onPlaybackStatusChange("idle");
      callbacksRef.current.onPlaybackNotes([]);
      return;
    }

    const gNote = ordered[index];
    const group = notesAtSameMoment(
      notesRef.current,
      gNote,
      handModeRef.current,
    );
    const selected = group
      .map((note) => graphicalNoteToSelected(note))
      .filter((note): note is SelectedNote => note !== null);
    if (selected.length === 0) {
      playbackIndexRef.current = index + 1;
      playbackTimerRef.current = window.setTimeout(
        () => stepPlaybackRef.current(),
        90,
      );
      return;
    }

    selectedGraphicalRef.current = gNote;
    selectedGroupRef.current = group;
    highlightNotes(notesRef.current, selectedGroupRef.current);
    callbacksRef.current.onPlaybackNotes(selected);
    callbacksRef.current.onSelectNote(selected);
    const measure = selected[0].measure;
    if (measure !== currentMeasureRef.current) {
      skipMeasureSyncRef.current = true;
      callbacksRef.current.onMeasureChange(measure);
      setCursorToMeasure(osmd, measure);
    }

    let nextIndex = index + 1;
    while (
      nextIndex < ordered.length &&
      notesSharePlaybackAttack(ordered[nextIndex], gNote)
    ) {
      nextIndex += 1;
    }
    const next = ordered[nextIndex] ?? null;
    playbackIndexRef.current = nextIndex;
    playbackTimerRef.current = window.setTimeout(
      () => stepPlaybackRef.current(),
      waitMsBetweenNotes(gNote, next, tempoRef.current),
    );
  };

  useEffect(() => {
    const osmd = osmdRef.current;
    if (!osmd) return;

    if (playbackStatus === "playing") {
      playbackIndexRef.current = -1;
      stopPlaybackTimer();
      stepPlaybackRef.current();
      return;
    }

    stopPlaybackTimer();
    if (playbackStatus === "idle") {
      playbackIndexRef.current = 0;
      osmd.cursor?.reset();
      osmd.cursor?.hide();
      callbacksRef.current.onPlaybackNotes([]);
    }
  }, [playbackStatus, stopPlaybackTimer]);

  return (
    <div className="relative min-h-[280px] w-full">
      {!musicXml ? (
        <p className="px-6 py-16 text-center text-sm text-zinc-500">
          Carga un archivo MusicXML o usa el ejemplo para ver la partitura.
        </p>
      ) : null}
      <div ref={hostRef} className="osmd-host w-full" />
    </div>
  );
}
