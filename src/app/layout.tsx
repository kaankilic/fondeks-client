import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { Analytics } from "@/components/layout/Analytics";
import { JsonLd } from "@/components/layout/JsonLd";
import { getFundCount } from "@/lib/fondeks/queries";
import { websiteSchema } from "@/lib/fondeks/schema";
import { ogMeta, twitterMeta } from "@/lib/fondeks/seo";
import { siteUrl } from "@/lib/fondeks/site";

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
  const title = "Fondeks — BIST fonlarını tek ekranda tara";
  const description = `${total} TEFAS fonu, canlı getiri sıralaması ve risk analizi. Yatırım kararlarını veriyle ver.`;

  return {
    metadataBase: new URL(siteUrl()),
    title: {
      default: title,
      template: "%s · Fondeks",
    },
    description,
    keywords: [
      "yatırım fonu",
      "TEFAS",
      "fon karşılaştırma",
      "fon getirisi",
      "BIST",
      "borsa",
    ],
    openGraph: ogMeta(title, description),
    twitter: twitterMeta(title, description),
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <JsonLd data={websiteSchema()} />
        {children}
      </body>
      <Analytics />
    </html>
  );
}
