import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Piano Score",
  description:
    "Visualiza partituras MusicXML, identifica notas y estudia el teclado de piano.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden bg-zinc-100 font-sans text-zinc-900">
        {children}
      </body>
    </html>
  );
}
