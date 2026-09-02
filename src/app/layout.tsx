import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { getFundCount } from "@/lib/fondeks/queries";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

// The fund count is part of the pitch, so it is read rather than hardcoded.
export async function generateMetadata(): Promise<Metadata> {
  const total = (await getFundCount()).toLocaleString("tr-TR");

  return {
    title: {
      default: "Fondeks — BIST fonlarını tek ekranda tara",
      template: "%s · Fondeks",
    },
    description: `${total} TEFAS fonu, canlı getiri sıralaması ve risk analizi. Yatırım kararlarını veriyle ver.`,
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
