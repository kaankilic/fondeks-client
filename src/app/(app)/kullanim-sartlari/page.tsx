import type { Metadata } from "next";

import { LegalPage } from "@/components/layout/LegalPage";
import { legalDescription, ogMeta, twitterMeta } from "@/lib/fondeks/seo";

/** Shown on the page and, trimmed, to a search engine. */
const LEAD =
  "Fondeks hesabını kullanırken geçerli olan koşullar, hizmet kapsamı ve sorumluluk sınırları bu sayfada yer alır.";

const TITLE = "Kullanım Şartları";
const DESCRIPTION = legalDescription(LEAD);

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["kullanım şartları", "hizmet koşulları"],
  openGraph: ogMeta(TITLE, DESCRIPTION),
  twitter: twitterMeta(TITLE, DESCRIPTION),
};

export default function Page() {
  return <LegalPage title="Kullanım Şartları" lead={LEAD} />;
}
