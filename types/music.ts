export type Hand = "left" | "right" | "unknown";
export type HandMode = "both" | "left" | "right";
export type PlaybackStatus = "idle" | "playing" | "paused";

export type SelectedNote = {
  scientificName: string;
  spanishName: string;
  midi: number;
  octave: number;
  measure: number;
  staff: number;
  hand: Hand;
  duration?: string;
};

export type OsmdDebugInfo = {
  pitch: Record<string, unknown>;
  sourceNote: Record<string, unknown>;
  staffEntry: Record<string, unknown>;
  measure: Record<string, unknown>;
};

export type ScoreReadyInfo = {
  measureCount: number;
  title?: string;
  preferFlat?: boolean;
};

export type TooltipState = {
  x: number;
  y: number;
  spanishName: string;
  handLabel: string;
} | null;
