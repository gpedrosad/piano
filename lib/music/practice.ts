import { noteToMidi, parseScientificNote, scientificToSpanish } from "./midi";
import type { SelectedNote } from "@/types/music";

export type PracticeItem = {
  id: string;
  name: string;
  notes: string[];
  hint: string;
};

export type PracticeGuide = {
  id: string;
  title: string;
  keyLabel: string;
  rhythm: string;
  chords: PracticeItem[];
  pedals: PracticeItem[];
};

const GNOSSIENNE: PracticeGuide = {
  id: "gnossienne-no-1",
  title: "Gnossienne No. 1",
  keyLabel: "Fa menor · 4 bemoles",
  rhythm: "silencio (negra) → acorde (blanca) → acorde (negra)",
  chords: [
    {
      id: "fm",
      name: "Fa m",
      notes: ["Ab3", "C4", "F4"],
      hint: "El de casa. Casi toda la obra.",
    },
    {
      id: "bbm",
      name: "Si♭ m",
      notes: ["F3", "Bb3", "Db4"],
      hint: "El contraste. Compases 3, 4, 6, 8 y 11.",
    },
    {
      id: "cm",
      name: "Do m",
      notes: ["Eb3", "G3", "C4"],
      hint: "Aparece poco. Compases 1 y 3.",
    },
  ],
  pedals: [
    {
      id: "pedal-f",
      name: "Pedal Fa",
      notes: ["F2"],
      hint: "Tónica. Debajo del Fa m.",
    },
    {
      id: "pedal-bb",
      name: "Pedal Si♭",
      notes: ["Bb1"],
      hint: "Debajo del Si♭ m.",
    },
    {
      id: "pedal-c",
      name: "Pedal Do",
      notes: ["C3"],
      hint: "Un par de veces, como dominante.",
    },
  ],
};

const GUIDES: PracticeGuide[] = [GNOSSIENNE];

export function practiceGuideForScore(
  fileName: string | null,
  title?: string,
): PracticeGuide | null {
  const haystack = `${fileName ?? ""} ${title ?? ""}`.toLowerCase();
  return (
    GUIDES.find(
      (guide) =>
        haystack.includes(guide.id) ||
        haystack.includes(guide.title.toLowerCase()),
    ) ?? null
  );
}

export function selectedNotesFromPractice(
  item: PracticeItem,
  measure: number,
): SelectedNote[] {
  return item.notes.map((scientificName) => {
    const midi = noteToMidi(scientificName);
    const parsed = parseScientificNote(scientificName);
    return {
      scientificName,
      spanishName: scientificToSpanish(scientificName),
      midi,
      octave: parsed?.octave ?? Math.floor(midi / 12) - 1,
      measure,
      staff: 1,
      hand: "left" as const,
    };
  });
}
