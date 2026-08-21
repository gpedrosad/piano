import { AccidentalEnum, Pitch, type Note } from "opensheetmusicdisplay";
import { scientificToSpanish } from "./midi";

let scoreKeyFifths = 0;

export function setScoreKeyFifths(fifths: number): void {
  scoreKeyFifths = fifths;
}

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
  const alter = alterationFromWrittenPitch(note);
  const octave = octaveForSpelling(pitch, midi, alter);
  const accidental =
    alter === 0 ? "" : alter > 0 ? "#".repeat(alter) : "b".repeat(-alter);
  return `${letter}${accidental}${octave}`;
}

export function spanishNameFromOsmdNote(note: Note, midi: number): string {
  return scientificToSpanish(scientificNameFromOsmdNote(note, midi));
}

export function alterationFromWrittenPitch(note: Note): number {
  const pitch = note.Pitch;
  if (!pitch) return 0;

  const xml = (pitch.AccidentalXml ?? "").toLowerCase();
  if (xml === "natural" || xml === "n") return 0;
  if (xml === "flat" || xml === "b") return -1;
  if (xml === "sharp" || xml === "s" || xml === "#") return 1;
  if (xml === "double-flat" || xml === "bb") return -2;
  if (xml === "double-sharp" || xml === "##" || xml === "x") return 2;

  const accidental = pitch.Accidental;
  if (accidental === AccidentalEnum.NATURAL) return 0;
  if (accidental !== AccidentalEnum.NONE) {
    return Pitch.HalfTonesFromAccidental(accidental);
  }

  return soundingAlteration(note);
}

function soundingAlteration(note: Note): number {
  const pitch = note.Pitch;
  if (!pitch) return 0;

  const natural =
    pitch.FundamentalNote + 12 * (pitch.Octave + Pitch.OctaveXmlDifference);
  let delta = note.halfTone - natural;
  if (delta > 6) delta -= 12;
  if (delta < -6) delta += 12;
  if (delta >= -2 && delta <= 2) return delta;

  const midiPc = ((((note.halfTone + 12) % 12) + 12) % 12);
  let fromMidi = midiPc - pitch.FundamentalNote;
  if (fromMidi > 6) fromMidi -= 12;
  if (fromMidi < -6) fromMidi += 12;
  return fromMidi >= -2 && fromMidi <= 2 ? fromMidi : 0;
}

function octaveForSpelling(
  pitch: Pitch,
  midi: number,
  alter: number,
): number {
  const expected =
    (pitch.Octave + 1) * 12 + pitch.FundamentalNote + alter;
  if (Math.abs(expected - midi) >= 12) {
    return pitch.Octave + Math.round((midi - expected) / 12);
  }
  return pitch.Octave;
}

function midiFallbackName(midi: number): string {
  const names =
    scoreKeyFifths < 0
      ? ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
      : ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(midi / 12) - 1;
  const pc = ((midi % 12) + 12) % 12;
  return `${names[pc]}${octave}`;
}
