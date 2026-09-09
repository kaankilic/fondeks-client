import type { Metadata } from "next";

import { JsonLd } from "@/components/layout/JsonLd";
import { SearchWorkspace } from "@/components/screener/SearchWorkspace";
import { getFunds } from "@/lib/fondeks/queries";
import { breadcrumbSchema, webPageSchema } from "@/lib/fondeks/schema";
import { ogMeta, twitterMeta } from "@/lib/fondeks/seo";

const TITLE = "Arama & Filtre";
const DESCRIPTION =
  "TEFAS fonlarını isme, koda veya kategoriye göre ara, filtrele ve sırala.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["fon arama", "fon filtre", "TEFAS arama", "yatırım fonu ara"],
  openGraph: ogMeta(TITLE, DESCRIPTION),
  twitter: twitterMeta(TITLE, DESCRIPTION),
};

export default async function SearchPage({
  searchParams,
}: PageProps<"/arama">) {
  const { q } = await searchParams;
  const query = Array.isArray(q) ? (q[0] ?? "") : (q ?? "");

  // Full-bleed screen: the rail owns the left edge, results the right.
  return (
    <>
      <JsonLd data={webPageSchema(TITLE, DESCRIPTION, "/arama")} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Keşfet", href: "/" },
          { name: "Arama & Filtre", href: "/arama" },
        ])}
      />
      <SearchWorkspace funds={await getFunds()} initialQuery={query} />
    </>
  );
}
