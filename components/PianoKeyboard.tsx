"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  preferFlat?: boolean;
  onKeyClick: (midi: number, scientificName: string) => void;
};

export default function PianoKeyboard({
  startMidi = 48,
  endMidi = 84,
  selectedMidi = null,
  activeMidis = [],
  preferFlat = false,
  onKeyClick,
}: PianoKeyboardProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [whiteWidth, setWhiteWidth] = useState(28);
  const [keyHeight, setKeyHeight] = useState(116);

  const keys = useMemo(() => {
    const list: Array<{ midi: number; white: boolean; name: string }> = [];
    for (let midi = startMidi; midi <= endMidi; midi += 1) {
      list.push({
        midi,
        white: isWhiteKey(midi),
        name: midiToNote(midi, preferFlat),
      });
    }
    return list;
  }, [endMidi, preferFlat, startMidi]);

  const whiteKeys = keys.filter((key) => key.white);
  const blackKeys = keys.filter((key) => !key.white);
  const keyboardWidth = whiteKeys.length * whiteWidth;

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const update = () => {
      const available = scroller.clientWidth;
      const height = scroller.clientHeight || 116;
      setWhiteWidth(Math.max(18, Math.floor(available / whiteKeys.length)));
      setKeyHeight(height);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [whiteKeys.length]);

  const blackLeft = (midi: number) => {
    const whitesBefore = keys.filter(
      (key) => key.midi < midi && key.white,
    ).length;
    return whitesBefore * whiteWidth - whiteWidth * 0.32;
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
    const padding = 24;
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
    });
  }, [selectedMidi]);

  return (
    <div
      ref={scrollerRef}
      className="h-full w-full overflow-x-auto overscroll-x-contain"
    >
      <div
        className="relative h-full"
        style={{ width: keyboardWidth, minWidth: "100%" }}
      >
        {whiteKeys.map((key) => {
          const active = isActive(key.midi);
          const octaveLabel = key.name.startsWith("C") ? key.name : "";
          return (
            <button
              key={key.midi}
              type="button"
              data-midi={key.midi}
              aria-label={`${midiToSpanishNote(key.midi, preferFlat)} ${key.name}`}
              onClick={() => onKeyClick(key.midi, key.name)}
              className={`absolute bottom-0 border border-zinc-400 ${
                active ? "bg-amber-200" : "bg-white hover:bg-zinc-50"
              }`}
              style={{
                left:
                  whiteKeys.findIndex((item) => item.midi === key.midi) *
                  whiteWidth,
                width: whiteWidth,
                height: keyHeight,
              }}
            >
              <span className="absolute bottom-1 left-0 right-0 text-center text-[9px] text-zinc-500 landscape:text-[11px]">
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
              aria-label={`${midiToSpanishNote(key.midi, preferFlat)} ${key.name}`}
              onClick={() => onKeyClick(key.midi, key.name)}
              className={`absolute top-0 z-10 border border-zinc-900 ${
                active ? "bg-amber-500" : "bg-zinc-900 hover:bg-zinc-700"
              }`}
              style={{
                left: blackLeft(key.midi),
                width: whiteWidth * 0.62,
                height: keyHeight * 0.62,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
