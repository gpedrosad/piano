"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  isWhiteKey,
  midiToNote,
  midiToSpanishNote,
} from "@/lib/music/midi";

type PianoKeyboardProps = {
  startMidi?: number;
  endMidi?: number;
  selectedMidi?: number | null;
  activeMidis?: number[];
  onKeyClick: (midi: number, scientificName: string) => void;
};

export default function PianoKeyboard({
  startMidi = 48,
  endMidi = 84,
  selectedMidi = null,
  activeMidis = [],
  onKeyClick,
}: PianoKeyboardProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const keys = useMemo(() => {
    const list: Array<{ midi: number; white: boolean; name: string }> = [];
    for (let midi = startMidi; midi <= endMidi; midi += 1) {
      list.push({
        midi,
        white: isWhiteKey(midi),
        name: midiToNote(midi),
      });
    }
    return list;
  }, [endMidi, startMidi]);

  const whiteKeys = keys.filter((key) => key.white);
  const blackKeys = keys.filter((key) => !key.white);
  const whiteWidth = 28;
  const keyboardWidth = whiteKeys.length * whiteWidth;

  const blackLeft = (midi: number) => {
    const whitesBefore = keys.filter(
      (key) => key.midi < midi && key.white,
    ).length;
    return whitesBefore * whiteWidth - 9;
  };

  const isActive = (midi: number) =>
    selectedMidi === midi || activeMidis.includes(midi);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || selectedMidi === null) return;

    const key = scroller.querySelector(`[data-midi="${selectedMidi}"]`);
    if (!(key instanceof HTMLElement)) return;

    const keyRect = key.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    const padding = 32;
    const alreadyVisible =
      keyRect.left >= scrollerRect.left + padding &&
      keyRect.right <= scrollerRect.right - padding;

    if (alreadyVisible) return;

    const delta =
      keyRect.left +
      keyRect.width / 2 -
      (scrollerRect.left + scrollerRect.width / 2);
    const nextLeft = scroller.scrollLeft + delta;
    const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);

    scroller.scrollTo({
      left: Math.max(0, Math.min(max, nextLeft)),
      behavior: "smooth",
    });
  }, [selectedMidi]);

  return (
    <div
      ref={scrollerRef}
      className="w-full overflow-x-auto overscroll-x-contain"
    >
      <div
        className="relative mx-auto h-[116px]"
        style={{ width: keyboardWidth, minWidth: keyboardWidth }}
      >
        {whiteKeys.map((key) => {
          const active = isActive(key.midi);
          const octaveLabel = key.name.startsWith("C") ? key.name : "";
          return (
            <button
              key={key.midi}
              type="button"
              data-midi={key.midi}
              aria-label={`${midiToSpanishNote(key.midi)} ${key.name}`}
              onClick={() => onKeyClick(key.midi, key.name)}
              className={`absolute bottom-0 border border-zinc-400 ${
                active ? "bg-amber-200" : "bg-white hover:bg-zinc-50"
              }`}
              style={{
                left:
                  whiteKeys.findIndex((item) => item.midi === key.midi) *
                  whiteWidth,
                width: whiteWidth,
                height: 116,
              }}
            >
              <span className="absolute bottom-1.5 left-0 right-0 text-center text-[10px] text-zinc-500">
                {octaveLabel}
              </span>
            </button>
          );
        })}
        {blackKeys.map((key) => {
          const active = isActive(key.midi);
          return (
            <button
              key={key.midi}
              type="button"
              data-midi={key.midi}
              aria-label={`${midiToSpanishNote(key.midi)} ${key.name}`}
              onClick={() => onKeyClick(key.midi, key.name)}
              className={`absolute top-0 z-10 border border-zinc-900 ${
                active ? "bg-amber-500" : "bg-zinc-900 hover:bg-zinc-700"
              }`}
              style={{
                left: blackLeft(key.midi),
                width: 18,
                height: 70,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
