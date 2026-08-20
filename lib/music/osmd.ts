import {
  OpenSheetMusicDisplay,
  PointF2D,
  VexFlowGraphicalNote,
  type GraphicalMeasure,
  type GraphicalNote,
  type Note,
} from "opensheetmusicdisplay";
import { durationFromOsmdNote } from "./durations";
import {
  midiFromOsmdNote,
  scientificNameFromOsmdNote,
  spanishNameFromOsmdNote,
} from "./notes";
import type {
  Hand,
  HandMode,
  OsmdDebugInfo,
  SelectedNote,
} from "@/types/music";

export type InteractiveGraphicalNote = GraphicalNote & {
  getSVGGElement?: () => SVGGElement | null;
  getNoteheadSVGs?: () => HTMLElement[];
  getSVGId?: () => string;
  vfnoteIndex?: number;
  setColor?: (
    color: string,
    options?: {
      applyToNoteheads?: boolean;
      applyToStem?: boolean;
      applyToFlag?: boolean;
      applyToBeams?: boolean;
    },
  ) => void;
};

const SELECTED_COLOR = "#b45309";
const DEFAULT_COLOR = "#111827";
const UNIT = 10;

export function createOsmd(container: HTMLElement): OpenSheetMusicDisplay {
  return new OpenSheetMusicDisplay(container, {
    backend: "svg",
    autoResize: false,
    drawTitle: false,
    drawSubtitle: false,
    drawComposer: false,
    drawLyricist: false,
    drawCredits: false,
    drawPartNames: false,
    coloringEnabled: true,
    followCursor: false,
    newSystemFromXML: true,
    newPageFromXML: false,
    drawMeasureNumbers: true,
    cursorsOptions: [
      {
        type: 0,
        color: "#1d4ed8",
        alpha: 0.4,
        follow: true,
      },
      {
        type: 3,
        color: "#f59e0b",
        alpha: 0.14,
        follow: false,
      },
    ],
  });
}

export function collectGraphicalNotes(
  osmd: OpenSheetMusicDisplay,
): InteractiveGraphicalNote[] {
  const notes: InteractiveGraphicalNote[] = [];
  const measureList = osmd.GraphicSheet?.MeasureList;
  if (!measureList) return notes;

  for (const staffMeasures of measureList) {
    if (!staffMeasures) continue;
    for (const measure of staffMeasures) {
      if (!measure) continue;
      for (const staffEntry of measure.staffEntries ?? []) {
        for (const voiceEntry of staffEntry.graphicalVoiceEntries ?? []) {
          for (const note of voiceEntry.notes ?? []) {
            notes.push(note as InteractiveGraphicalNote);
          }
        }
      }
    }
  }

  return notes;
}

export function graphicalNoteToSelected(
  gNote: GraphicalNote,
): SelectedNote | null {
  const sourceNote = gNote.sourceNote;
  if (!sourceNote || sourceNote.isRest() || !sourceNote.Pitch) return null;

  const midi = midiFromOsmdNote(sourceNote);
  if (midi === null) return null;

  const scientificName = scientificNameFromOsmdNote(sourceNote, midi);
  const staff = staffIndexFromNote(sourceNote);
  const measure =
    sourceNote.SourceMeasure?.MeasureNumber ??
    gNote.parentVoiceEntry?.parentStaffEntry?.parentMeasure?.MeasureNumber ??
    1;
  const octaveMatch = scientificName.match(/-?\d+$/);

  return {
    scientificName,
    spanishName: spanishNameFromOsmdNote(sourceNote, midi),
    midi,
    octave: octaveMatch ? Number(octaveMatch[0]) : 4,
    measure,
    staff,
    hand: handFromStaffIndex(staff),
    duration: durationFromOsmdNote(sourceNote),
  };
}

export function debugInfoFromGraphicalNote(
  gNote: GraphicalNote,
): OsmdDebugInfo {
  const sourceNote = gNote.sourceNote;
  const pitch = sourceNote?.Pitch;
  const staffEntry = gNote.parentVoiceEntry?.parentStaffEntry;
  const measure = staffEntry?.parentMeasure?.parentSourceMeasure;

  return {
    pitch: pitch
      ? {
          toStringShort: pitch.ToStringShort(),
          octave: pitch.Octave,
          fundamentalNote: pitch.FundamentalNote,
          accidental: pitch.Accidental,
          accidentalHalfTones: pitch.AccidentalHalfTones,
          halfTone: pitch.getHalfTone(),
          frequency: pitch.Frequency,
        }
      : {},
    sourceNote: sourceNote
      ? {
          halfTone: sourceNote.halfTone,
          isRest: sourceNote.isRest(),
          length: sourceNote.Length?.RealValue,
          typeLength: sourceNote.TypeLength?.RealValue,
          noteTypeXml: sourceNote.NoteTypeXml,
          staffId: sourceNote.ParentStaff?.Id,
          toStringShort: sourceNote.ToStringShort(),
        }
      : {},
    staffEntry: staffEntry
      ? {
          relInMeasureTimestamp: staffEntry.relInMeasureTimestamp?.RealValue,
          staffId: staffEntry.parentMeasure?.ParentStaff?.Id,
        }
      : {},
    measure: measure
      ? {
          measureNumber: measure.MeasureNumber,
          measureListIndex: measure.measureListIndex,
          duration: measure.Duration?.RealValue,
        }
      : {},
  };
}

export function staffIndexFromNote(sourceNote: Note): number {
  const staff = sourceNote.ParentStaff;
  const staves = staff?.ParentInstrument?.Staves;
  if (staff && staves && staves.length > 0) {
    const byReference = staves.indexOf(staff);
    if (byReference >= 0) return byReference;
    const byId = staves.findIndex((item) => item.Id === staff.Id);
    if (byId >= 0) return byId;
  }
  const id = staff?.Id ?? 0;
  return id >= 1 ? id - 1 : id;
}

export function handFromStaffIndex(index: number): Hand {
  if (index === 0) return "right";
  if (index === 1) return "left";
  return "unknown";
}

function relativeTime(gNote: GraphicalNote): number {
  const fromStaff =
    gNote.parentVoiceEntry?.parentStaffEntry?.relInMeasureTimestamp?.RealValue;
  if (typeof fromStaff === "number") return fromStaff;
  const fromSource = gNote.sourceNote?.ParentVoiceEntry?.Timestamp?.RealValue;
  if (typeof fromSource === "number") return fromSource;
  return 0;
}

export function noteTimestamp(gNote: GraphicalNote): number {
  const absolute = gNote.sourceNote?.getAbsoluteTimestamp?.()?.RealValue;
  if (typeof absolute === "number" && !Number.isNaN(absolute)) return absolute;
  const measureAbs =
    gNote.sourceNote?.SourceMeasure?.AbsoluteTimestamp?.RealValue ?? 0;
  return measureAbs + relativeTime(gNote);
}

export function waitMsBetweenNotes(
  current: GraphicalNote,
  next: GraphicalNote | null,
  tempoBpm: number,
): number {
  const beatMs = (60 / Math.max(20, tempoBpm)) * 1000;
  if (!next) {
    const len = current.sourceNote?.Length?.RealValue ?? 0.25;
    return Math.max(90, len * 4 * beatMs);
  }
  const dt = noteTimestamp(next) - noteTimestamp(current);
  if (dt <= 1e-3) return 200;
  return Math.max(160, dt * 4 * beatMs);
}

export function playableNotesInOrder(
  notes: InteractiveGraphicalNote[],
): InteractiveGraphicalNote[] {
  return notes
    .filter((note) => {
      const source = note.sourceNote;
      if (!source || source.isRest() || !source.Pitch) return false;
      if (source.PrintObject === false) return false;
      return true;
    })
    .slice()
    .sort((a, b) => {
      const timeA = noteTimestamp(a);
      const timeB = noteTimestamp(b);
      if (timeA !== timeB) return timeA - timeB;

      const graceA = a.sourceNote?.IsGraceNote ? 0 : 1;
      const graceB = b.sourceNote?.IsGraceNote ? 0 : 1;
      if (graceA !== graceB) return graceA - graceB;

      const staffA = a.sourceNote ? staffIndexFromNote(a.sourceNote) : 0;
      const staffB = b.sourceNote ? staffIndexFromNote(b.sourceNote) : 0;
      if (staffA !== staffB) return staffA - staffB;

      const midiA = a.sourceNote ? (midiFromOsmdNote(a.sourceNote) ?? 0) : 0;
      const midiB = b.sourceNote ? (midiFromOsmdNote(b.sourceNote) ?? 0) : 0;
      return midiA - midiB;
    });
}

export function indexOfPlayableNote(
  ordered: GraphicalNote[],
  current: GraphicalNote | null,
): number {
  if (!current) return -1;
  const byReference = ordered.findIndex((note) => note === current);
  if (byReference >= 0) return byReference;
  return ordered.findIndex((note) => notesMatch(note, current));
}

export function notesMatch(
  a: GraphicalNote | null,
  b: GraphicalNote | null,
): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const sourceA = a.sourceNote;
  const sourceB = b.sourceNote;
  if (!sourceA || !sourceB) return false;
  return (
    (sourceA.SourceMeasure?.MeasureNumber ?? 0) ===
      (sourceB.SourceMeasure?.MeasureNumber ?? 0) &&
    Math.abs(noteTimestamp(a) - noteTimestamp(b)) < 1e-6 &&
    staffIndexFromNote(sourceA) === staffIndexFromNote(sourceB) &&
    midiFromOsmdNote(sourceA) === midiFromOsmdNote(sourceB)
  );
}

export function notesAtSameMoment(
  notes: InteractiveGraphicalNote[],
  moment: GraphicalNote,
  mode: HandMode,
): InteractiveGraphicalNote[] {
  const time = noteTimestamp(moment);
  return playableNotesInOrder(notes).filter((note) => {
    if (!isNoteInHandMode(note, mode)) return false;
    return Math.abs(noteTimestamp(note) - time) < 1e-4;
  });
}

export function stepToPlayableNote(
  notes: InteractiveGraphicalNote[],
  current: GraphicalNote | null,
  direction: -1 | 1,
  mode: HandMode,
): GraphicalNote | null {
  const ordered = playableNotesInOrder(notes).filter((note) =>
    isNoteInHandMode(note, mode),
  );
  if (ordered.length === 0) return null;

  const currentIndex = indexOfPlayableNote(ordered, current);
  const from =
    currentIndex >= 0 ? currentIndex : direction > 0 ? -1 : ordered.length;
  const next = from + direction;
  if (next < 0 || next >= ordered.length) return null;
  return ordered[next];
}

export function isNoteInHandMode(
  note: GraphicalNote,
  mode: HandMode,
): boolean {
  if (mode === "both" || !note.sourceNote) return true;
  const hand = handFromStaffIndex(staffIndexFromNote(note.sourceNote));
  if (mode === "right") return hand !== "left";
  if (mode === "left") return hand !== "right";
  return true;
}

export function scrollNoteIntoView(
  note: GraphicalNote,
  container: HTMLElement,
): void {
  const vex = asVexNote(note);
  const el = ownNotehead(note) ?? vex?.getSVGGElement?.() ?? null;
  if (!(el instanceof Element)) return;

  const scroller = container.parentElement;
  if (!scroller) return;

  const targetRect = el.getBoundingClientRect();
  const scrollerRect = scroller.getBoundingClientRect();
  const padding = 28;
  const visibleVertically =
    targetRect.top >= scrollerRect.top + padding &&
    targetRect.bottom <= scrollerRect.bottom - padding;
  const visibleHorizontally =
    targetRect.left >= scrollerRect.left + padding &&
    targetRect.right <= scrollerRect.right - padding;

  if (visibleVertically && visibleHorizontally) return;

  scroller.scrollTo({
    top: scroller.scrollTop + (targetRect.top - scrollerRect.top) - padding,
    left: scroller.scrollLeft + (targetRect.left - scrollerRect.left) - padding,
  });
}

export function applyHandMode(
  notes: InteractiveGraphicalNote[],
  mode: HandMode,
): void {
  for (const note of notes) {
    const staff = note.sourceNote
      ? staffIndexFromNote(note.sourceNote)
      : 0;
    const hand = handFromStaffIndex(staff);
    const dimmed =
      (mode === "right" && hand === "left") ||
      (mode === "left" && hand === "right");
    setNoteOpacity(note, dimmed ? 0.18 : 1);
  }
}

export function highlightNotes(
  notes: InteractiveGraphicalNote[],
  selected: GraphicalNote[],
): void {
  for (const note of notes) {
    colorOwnNotehead(note, DEFAULT_COLOR);
    try {
      note.setColor?.(DEFAULT_COLOR, {
        applyToNoteheads: false,
        applyToStem: true,
        applyToFlag: true,
      });
    } catch {
      // Some OSMD objects may not support coloring.
    }
  }

  for (const item of selected) {
    const target = item as InteractiveGraphicalNote;
    colorOwnNotehead(target, SELECTED_COLOR);
    try {
      target.setColor?.(SELECTED_COLOR, {
        applyToNoteheads: false,
        applyToStem: true,
        applyToFlag: true,
      });
    } catch {
      // Ignore coloring failures.
    }
  }
}

export function highlightNote(
  notes: InteractiveGraphicalNote[],
  selected: GraphicalNote | null,
): void {
  highlightNotes(notes, selected ? [selected] : []);
}

export function highlightMeasure(
  container: HTMLElement,
  osmd: OpenSheetMusicDisplay,
  measureNumber: number,
): void {
  clearMeasureHighlights(container);
  const svg = container.querySelector("svg");
  if (!svg) return;

  const measures = findMeasuresByNumber(osmd, measureNumber);
  const zoom = osmd.Zoom || 1;

  for (const measure of measures) {
    const box = measure.PositionAndShape;
    if (!box) continue;
    const abs = box.AbsolutePosition;
    const size = box.Size;
    if (!abs || !size) continue;

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", String(abs.x * UNIT * zoom));
    rect.setAttribute("y", String(abs.y * UNIT * zoom));
    rect.setAttribute("width", String(Math.max(size.width, 1) * UNIT * zoom));
    rect.setAttribute("height", String(Math.max(size.height, 1) * UNIT * zoom));
    rect.setAttribute("fill", "#f59e0b");
    rect.setAttribute("fill-opacity", "0.12");
    rect.setAttribute("stroke", "#d97706");
    rect.setAttribute("stroke-opacity", "0.45");
    rect.setAttribute("stroke-width", "1.5");
    rect.setAttribute("pointer-events", "none");
    rect.setAttribute("data-measure-highlight", String(measureNumber));
    svg.insertBefore(rect, svg.firstChild);
  }

  scrollMeasureIntoView(measures[0], container);
}

export function clearMeasureHighlights(container: HTMLElement): void {
  container
    .querySelectorAll("[data-measure-highlight]")
    .forEach((node) => node.remove());
}

export function autoFitZoom(
  osmd: OpenSheetMusicDisplay,
  container: HTMLElement,
): void {
  osmd.Zoom = 1;
  osmd.render();

  const svg = container.querySelector("svg");
  if (!svg) return;

  const available = Math.max(container.clientWidth - 32, 320);
  const bboxWidth = getSvgContentWidth(svg);
  if (bboxWidth <= 0) return;

  const zoom = Math.min(1.15, Math.max(0.55, available / bboxWidth));
  osmd.Zoom = zoom;
  osmd.render();
}

export function findNearestNote(
  osmd: OpenSheetMusicDisplay,
  container: HTMLElement,
  event: MouseEvent,
): GraphicalNote | null {
  const graphic = osmd.GraphicSheet;
  if (!graphic) return null;

  const svg = container.querySelector("svg");
  if (!svg) return null;

  const rect = svg.getBoundingClientRect();
  const click = new PointF2D(
    event.clientX - rect.left,
    event.clientY - rect.top,
  );

  try {
    const osmdPoint = graphic.svgToOsmd
      ? graphic.svgToOsmd(click)
      : new PointF2D(click.x / UNIT / osmd.Zoom, click.y / UNIT / osmd.Zoom);
    const nearest = graphic.GetNearestNote(osmdPoint, new PointF2D(5, 5));
    if (nearest?.sourceNote && !nearest.sourceNote.isRest()) {
      return nearest;
    }
  } catch {
    // Coordinate conversion can fail depending on OSMD backend state.
  }

  return null;
}

export function asVexNote(note: GraphicalNote): VexFlowGraphicalNote | null {
  const maybe = note as InteractiveGraphicalNote;
  if (typeof maybe.getSVGGElement === "function") {
    return note as VexFlowGraphicalNote;
  }
  return null;
}

export function ownNotehead(note: GraphicalNote): HTMLElement | null {
  const vex = asVexNote(note);
  const heads = vex?.getNoteheadSVGs?.() ?? [];
  if (heads.length === 0) return null;
  const index = vex?.vfnoteIndex;
  if (typeof index === "number" && heads[index]) return heads[index];
  if (heads.length === 1) return heads[0];
  return null;
}

function paintNotehead(head: HTMLElement, color: string): void {
  head.setAttribute("fill", color);
  for (const child of Array.from(head.children)) {
    child.setAttribute("fill", color);
  }
}

export function colorOwnNotehead(note: GraphicalNote, color: string): void {
  const head = ownNotehead(note);
  if (head) paintNotehead(head, color);
}

export function setCursorToMeasure(
  osmd: OpenSheetMusicDisplay,
  measureNumber: number,
): void {
  if (!osmd.cursor) return;
  osmd.cursor.reset();
  osmd.cursor.show();
  let guard = 0;
  while (
    !osmd.cursor.iterator.EndReached &&
    (osmd.cursor.iterator.CurrentMeasure?.MeasureNumber ?? 1) < measureNumber &&
    guard < 4000
  ) {
    osmd.cursor.nextMeasure();
    guard += 1;
  }

  syncSecondaryCursor(osmd);
}

export function syncSecondaryCursor(osmd: OpenSheetMusicDisplay): void {
  const secondary = osmd.cursors?.[1];
  const primary = osmd.cursor;
  if (!secondary || !primary) return;
  try {
    secondary.reset();
    let guard = 0;
    const target = primary.iterator.CurrentMeasure?.MeasureNumber ?? 1;
    while (
      !secondary.iterator.EndReached &&
      (secondary.iterator.CurrentMeasure?.MeasureNumber ?? 1) < target &&
      guard < 4000
    ) {
      secondary.nextMeasure();
      guard += 1;
    }
    secondary.show();
  } catch {
    // Secondary cursor is optional.
  }
}

export function getMeasureCount(osmd: OpenSheetMusicDisplay): number {
  return osmd.Sheet?.SourceMeasures?.length ?? 0;
}

export function durationSecondsFromCursor(
  osmd: OpenSheetMusicDisplay,
  tempoBpm: number,
): number {
  const notes = osmd.cursor?.NotesUnderCursor?.() ?? [];
  const lengths = notes
    .filter((note) => !note.isRest())
    .map((note) => note.Length?.RealValue ?? 0)
    .filter((value) => value > 0);
  const wholes = lengths.length > 0 ? Math.min(...lengths) : 0.25;
  return Math.max(0.08, wholes * 4 * (60 / Math.max(20, tempoBpm)));
}

function setNoteOpacity(note: InteractiveGraphicalNote, opacity: number): void {
  const elements: Array<Element | null | undefined> = [
    ownNotehead(note),
    asVexNote(note)?.getStemSVG?.(),
  ];
  for (const el of elements) {
    if (el instanceof Element) {
      (el as HTMLElement).style.opacity = String(opacity);
    }
  }
}

function findMeasuresByNumber(
  osmd: OpenSheetMusicDisplay,
  measureNumber: number,
): GraphicalMeasure[] {
  const found: GraphicalMeasure[] = [];
  const measureList = osmd.GraphicSheet?.MeasureList ?? [];
  for (const staffMeasures of measureList) {
    if (!staffMeasures) continue;
    for (const measure of staffMeasures) {
      if (!measure) continue;
      if (measure.MeasureNumber === measureNumber) {
        found.push(measure);
      }
    }
  }
  return found;
}

function scrollMeasureIntoView(
  measure: GraphicalMeasure | undefined,
  container: HTMLElement,
): void {
  if (!measure) return;
  const scroller = container.parentElement;
  if (!scroller) return;

  const highlight = container.querySelector("[data-measure-highlight]");
  const target = highlight instanceof HTMLElement ? highlight : null;
  if (!target) return;

  const targetRect = target.getBoundingClientRect();
  const scrollerRect = scroller.getBoundingClientRect();
  const padding = 16;
  const visibleVertically =
    targetRect.top >= scrollerRect.top + padding &&
    targetRect.bottom <= scrollerRect.bottom - padding;
  const visibleHorizontally =
    targetRect.left >= scrollerRect.left + padding &&
    targetRect.right <= scrollerRect.right - padding;

  if (visibleVertically && visibleHorizontally) return;

  scroller.scrollTo({
    top: scroller.scrollTop + (targetRect.top - scrollerRect.top) - padding,
    left: scroller.scrollLeft + (targetRect.left - scrollerRect.left) - padding,
    behavior: "smooth",
  });
}

function getSvgContentWidth(svg: SVGSVGElement): number {
  try {
    const bbox = svg.getBBox();
    if (bbox.width > 0) return bbox.width;
  } catch {
    // getBBox can throw if the SVG is not in the DOM.
  }
  const attr = svg.getAttribute("width");
  const parsed = attr ? Number.parseFloat(attr) : 0;
  return Number.isFinite(parsed) ? parsed : svg.clientWidth;
}
