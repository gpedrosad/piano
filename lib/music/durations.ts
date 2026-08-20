import { NoteType, NoteTypeHandler, type Note } from "opensheetmusicdisplay";

const SPANISH_DURATION: Record<string, string> = {
  maxima: "máxima",
  longa: "longa",
  long: "longa",
  breve: "breve",
  whole: "redonda",
  half: "blanca",
  quarter: "negra",
  eighth: "corchea",
  eigth: "corchea",
  "8th": "corchea",
  "16th": "semicorchea",
  "32nd": "fusa",
  "64th": "semifusa",
  "128th": "garrapatea",
  "256th": "semigarrapatea",
};

export function durationFromOsmdNote(note: Note): string {
  const dots = note.DotsXml || note.Length?.calculateNumberOfNeededDots?.() || 0;
  const typeName = noteTypeToName(note);
  const spanish = SPANISH_DURATION[typeName] ?? typeName;
  if (!spanish) return "desconocida";
  if (dots === 1) return `${spanish} con puntillo`;
  if (dots >= 2) return `${spanish} con ${dots} puntillos`;
  return spanish;
}

function noteTypeToName(note: Note): string {
  try {
    const xmlType = note.NoteTypeXml as NoteType | undefined;
    if (xmlType !== undefined && xmlType !== NoteType.UNDEFINED) {
      const raw = NoteTypeHandler.NoteTypeToString(xmlType);
      return normalizeTypeName(raw);
    }
  } catch {
    // OSMD may not always expose NoteTypeXml.
  }

  const value = note.TypeLength?.RealValue ?? note.Length?.RealValue;
  if (typeof value !== "number" || Number.isNaN(value)) return "";

  const map: Array<[number, string]> = [
    [2, "breve"],
    [1, "whole"],
    [0.5, "half"],
    [0.25, "quarter"],
    [0.125, "eighth"],
    [0.0625, "16th"],
    [0.03125, "32nd"],
    [0.015625, "64th"],
  ];

  let closest = map[0];
  let best = Number.POSITIVE_INFINITY;
  for (const entry of map) {
    const diff = Math.abs(entry[0] - value);
    if (diff < best) {
      best = diff;
      closest = entry;
    }
  }
  return closest[1];
}

function normalizeTypeName(raw: string): string {
  return raw.toLowerCase().replace(/^_+/, "");
}
