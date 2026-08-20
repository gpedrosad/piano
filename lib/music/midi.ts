const LETTER_SEMITONES: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const SHARP_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export function noteToMidi(note: string): number {
  const parsed = parseScientificNote(note);
  if (!parsed) {
    throw new Error(`Nombre de nota inválido: ${note}`);
  }

  return (parsed.octave + 1) * 12 + parsed.letterSemitone + parsed.accidental;
}

export function midiToNote(midi: number, preferFlat = false): string {
  const rounded = Math.round(midi);
  const octave = Math.floor(rounded / 12) - 1;
  const pc = ((rounded % 12) + 12) % 12;

  if (!preferFlat) {
    return `${SHARP_NAMES[pc]}${octave}`;
  }

  const flatNames = [
    "C",
    "Db",
    "D",
    "Eb",
    "E",
    "F",
    "Gb",
    "G",
    "Ab",
    "A",
    "Bb",
    "B",
  ];
  return `${flatNames[pc]}${octave}`;
}

export function midiToSpanishNote(midi: number, preferFlat = false): string {
  const scientific = midiToNote(midi, preferFlat);
  return scientificToSpanish(scientific);
}

export function scientificToSpanish(scientificName: string): string {
  const parsed = parseScientificNote(scientificName);
  if (!parsed) return scientificName;

  const letterMap: Record<string, string> = {
    C: "DO",
    D: "RE",
    E: "MI",
    F: "FA",
    G: "SOL",
    A: "LA",
    B: "SI",
  };

  const accidental =
    parsed.accidental === 0
      ? ""
      : parsed.accidental > 0
        ? "♯".repeat(parsed.accidental)
        : "♭".repeat(-parsed.accidental);

  return `${letterMap[parsed.letter]}${accidental}${parsed.octave}`;
}

export function noteAnnouncementLabel(
  scientificName: string,
  spanishName: string,
  withOctave = false,
): string {
  const parsed = parseScientificNote(scientificName);
  if (!parsed) return `${scientificName} (${spanishName})`;

  const accidental =
    parsed.accidental === 0
      ? ""
      : parsed.accidental > 0
        ? "♯".repeat(parsed.accidental)
        : "♭".repeat(-parsed.accidental);

  const letter = withOctave
    ? `${parsed.letter}${accidental}${parsed.octave}`
    : `${parsed.letter}${accidental}`;
  const solfege = spanishName.replace(/-?\d+$/, "");
  return `${letter} (${solfege})`;
}

export function notesAnnouncementLabel(
  notes: Array<{ scientificName: string; spanishName: string; midi: number }>,
): string {
  const unique = uniqueByMidi(notes);
  const withOctave = unique.length > 1;
  return unique
    .map((note) =>
      noteAnnouncementLabel(note.scientificName, note.spanishName, withOctave),
    )
    .join(" · ");
}

function uniqueByMidi<T extends { midi: number }>(notes: T[]): T[] {
  const seen = new Set<number>();
  const unique: T[] = [];
  for (const note of [...notes].sort((a, b) => a.midi - b.midi)) {
    if (seen.has(note.midi)) continue;
    seen.add(note.midi);
    unique.push(note);
  }
  return unique;
}

export function parseScientificNote(note: string): {
  letter: string;
  letterSemitone: number;
  accidental: number;
  octave: number;
} | null {
  const normalized = note
    .trim()
    .replace(/♯/g, "#")
    .replace(/♭/g, "b")
    .replace(/♮/g, "")
    .replace(/x/gi, "##");

  const match = normalized.match(/^([A-Ga-g])([#b]+|n)?(-?\d+)$/);
  if (!match) return null;

  const letter = match[1].toUpperCase();
  const accidentalRaw = match[2] ?? "";
  const octave = Number(match[3]);
  const letterSemitone = LETTER_SEMITONES[letter];
  if (letterSemitone === undefined || Number.isNaN(octave)) return null;

  let accidental = 0;
  if (accidentalRaw && accidentalRaw !== "n") {
    for (const char of accidentalRaw) {
      if (char === "#") accidental += 1;
      if (char === "b") accidental -= 1;
    }
  }

  return { letter, letterSemitone, accidental, octave };
}

export function toTonePitch(scientificName: string): string {
  return scientificName
    .replace(/♯/g, "#")
    .replace(/♭/g, "b")
    .replace(/♮/g, "")
    .replace(/n(?=-?\d)/, "");
}

export function isWhiteKey(midi: number): boolean {
  const pc = ((midi % 12) + 12) % 12;
  return [0, 2, 4, 5, 7, 9, 11].includes(pc);
}
