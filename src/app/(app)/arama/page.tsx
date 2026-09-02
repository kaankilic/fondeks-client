import type { Metadata } from "next";

import { SearchWorkspace } from "@/components/screener/SearchWorkspace";
import { getFunds } from "@/lib/fondeks/queries";

export const metadata: Metadata = { title: "Arama & Filtre" };

export default async function SearchPage({
  searchParams,
}: PageProps<"/arama">) {
  const { q } = await searchParams;
  const query = Array.isArray(q) ? (q[0] ?? "") : (q ?? "");

  // Full-bleed screen: the rail owns the left edge, results the right.
  return <SearchWorkspace funds={await getFunds()} initialQuery={query} />;
}
