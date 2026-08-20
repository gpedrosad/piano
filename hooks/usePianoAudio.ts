"use client";

import { useCallback, useEffect, useRef } from "react";
import { midiToNote, toTonePitch } from "@/lib/music/midi";

type ToneModule = typeof import("tone");

let tonePromise: Promise<ToneModule> | null = null;
let synth: import("tone").PolySynth | null = null;

async function getTone(): Promise<ToneModule> {
  if (!tonePromise) {
    tonePromise = import("tone");
  }
  return tonePromise;
}

async function ensureSynth() {
  const Tone = await getTone();
  await Tone.start();
  if (!synth) {
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.005, decay: 0.15, sustain: 0.15, release: 0.4 },
    }).toDestination();
    synth.volume.value = -8;
  }
  return { Tone, synth };
}

export function usePianoAudio() {
  const readyRef = useRef(false);

  useEffect(() => {
    return () => {
      synth?.dispose();
      synth = null;
      readyRef.current = false;
    };
  }, []);

  const playNote = useCallback(async (note: string, duration = "8n") => {
    const pitch = toTonePitch(note);
    const { synth: activeSynth } = await ensureSynth();
    readyRef.current = true;
    activeSynth.triggerAttackRelease(pitch, duration);
  }, []);

  const playMidi = useCallback(
    async (midi: number, duration = "8n") => {
      await playNote(midiToNote(midi), duration);
    },
    [playNote],
  );

  const playNotes = useCallback(async (notes: string[], duration = "8n") => {
    if (notes.length === 0) return;
    const { synth: activeSynth } = await ensureSynth();
    readyRef.current = true;
    activeSynth.triggerAttackRelease(notes.map(toTonePitch), duration);
  }, []);

  return { playNote, playMidi, playNotes };
}
