import type { Metadata } from "next";

import { LegalPage } from "@/components/layout/LegalPage";
import { legalDescription } from "@/lib/fondeks/seo";

/** Shown on the page and, trimmed, to a search engine. */
const LEAD =
  "Fondeks hesabını kullanırken geçerli olan koşullar, hizmet kapsamı ve sorumluluk sınırları bu sayfada yer alır.";

export const metadata: Metadata = {
  title: "Kullanım Şartları",
  description: legalDescription(LEAD),
};

export default function Page() {
  return <LegalPage title="Kullanım Şartları" lead={LEAD} />;
}
