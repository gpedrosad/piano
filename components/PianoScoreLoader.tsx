"use client";

import dynamic from "next/dynamic";

const PianoScoreApp = dynamic(() => import("@/components/PianoScoreApp"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 text-sm text-zinc-500">
      Cargando Piano Score…
    </div>
  ),
});

export default function PianoScoreLoader() {
  return <PianoScoreApp />;
}
