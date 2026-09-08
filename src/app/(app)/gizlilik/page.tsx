import type { Metadata } from "next";

import { LegalPage } from "@/components/layout/LegalPage";
import { legalDescription, ogMeta, twitterMeta } from "@/lib/fondeks/seo";

/** Shown on the page and, trimmed, to a search engine. */
const LEAD =
  "Fondeks'i kullanırken hangi verileri topladığımızı, bu verileri neden işlediğimizi ve nasıl sakladığımızı bu sayfada açıklıyoruz.";

const TITLE = "Gizlilik Sözleşmesi";
const DESCRIPTION = legalDescription(LEAD);

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["gizlilik politikası", "kişisel veri", "veri koruma"],
  openGraph: ogMeta(TITLE, DESCRIPTION),
  twitter: twitterMeta(TITLE, DESCRIPTION),
};

export default function Page() {
  return <LegalPage title="Gizlilik Sözleşmesi" lead={LEAD} />;
}
