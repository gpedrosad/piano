"use client";

import { useCallback, useState } from "react";

export function useMusicXml() {
  const [musicXml, setMusicXml] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadText = useCallback((xml: string, name: string) => {
    setMusicXml(xml);
    setFileName(name);
    setError(null);
  }, []);

  const loadFile = useCallback(async (file: File) => {
    const lower = file.name.toLowerCase();
    if (
      !lower.endsWith(".xml") &&
      !lower.endsWith(".musicxml") &&
      !lower.endsWith(".mxl")
    ) {
      setError("El archivo debe ser .musicxml, .xml o .mxl");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const text = await file.text();
      if (!text.includes("<score-partwise") && !text.includes("<score-timewise")) {
        setError("El archivo no parece un MusicXML válido");
        return;
      }
      setMusicXml(text);
      setFileName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo leer el archivo");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFromUrl = useCallback(async (url: string, name: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`No se encontró ${name}`);
      }
      const text = await response.text();
      if (!text.includes("<score-partwise") && !text.includes("<score-timewise")) {
        throw new Error("El archivo no parece un MusicXML válido");
      }
      setMusicXml(text);
      setFileName(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la partitura");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadExample = useCallback(async () => {
    await loadFromUrl("/scores/example.musicxml", "example.musicxml");
  }, [loadFromUrl]);

  const loadGnossienne = useCallback(async () => {
    await loadFromUrl(
      "/scores/gnossienne-no-1.musicxml",
      "gnossienne-no-1.musicxml",
    );
  }, [loadFromUrl]);

  return {
    musicXml,
    fileName,
    error,
    loading,
    loadFile,
    loadExample,
    loadGnossienne,
    loadText,
  };
}
