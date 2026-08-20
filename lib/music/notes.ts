import { Pitch, type AccidentalEnum, type Note } from "opensheetmusicdisplay";
import { scientificToSpanish } from "./midi";

const ACCIDENTAL_ASCII: Partial<Record<number, string>> = {
  0: "#",
  1: "b",
  2: "",
  3: "",
  4: "##",
  5: "bb",
  6: "###",
  7: "bbb",
};

export function midiFromOsmdNote(note: Note): number | null {
  if (note.isRest() || !note.Pitch) return null;

  const fromHalfTone = note.halfTone + 12;
  if (fromHalfTone >= 12 && fromHalfTone <= 127) {
    return fromHalfTone;
  }

  return midiFromOsmdPitch(note.Pitch, fromHalfTone);
}

export function midiFromOsmdPitch(pitch: Pitch, halfToneHint?: number): number {
  const expected =
    (pitch.Octave + 1) * 12 + pitch.FundamentalNote + pitch.AccidentalHalfTones;
  const hint = halfToneHint ?? expected;

  if (Math.abs(expected - hint) >= 12) {
    return expected + Math.round((hint - expected) / 12) * 12;
  }

  return expected;
}

export function scientificNameFromOsmdNote(note: Note, midi: number): string {
  const pitch = note.Pitch;
  if (!pitch) return midiFallbackName(midi);

  const letter = Pitch.getNoteEnumString(pitch.FundamentalNote);
  const octave = octaveForSpelling(pitch, midi);
  const letterPc = ((pitch.FundamentalNote % 12) + 12) % 12;
  const midiPc = ((midi % 12) + 12) % 12;
  let delta = midiPc - letterPc;
  if (delta > 6) delta -= 12;
  if (delta < -6) delta += 12;

  const accidental =
    delta === 0 ? "" : delta > 0 ? "#".repeat(delta) : "b".repeat(-delta);
  return `${letter}${accidental}${octave}`;
}

export function spanishNameFromOsmdNote(note: Note, midi: number): string {
  return scientificToSpanish(scientificNameFromOsmdNote(note, midi));
}

export function accidentalToAscii(accidental: AccidentalEnum | number): string {
  return ACCIDENTAL_ASCII[accidental as number] ?? "";
}

function octaveForSpelling(pitch: Pitch, midi: number): number {
  const expected =
    (pitch.Octave + 1) * 12 + pitch.FundamentalNote + pitch.AccidentalHalfTones;
  if (Math.abs(expected - midi) >= 12) {
    return pitch.Octave + Math.round((midi - expected) / 12);
  }
  return pitch.Octave;
}

function midiFallbackName(midi: number): string {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(midi / 12) - 1;
  const pc = ((midi % 12) + 12) % 12;
  return `${names[pc]}${octave}`;
}
