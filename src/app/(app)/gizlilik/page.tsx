import type { Metadata } from "next";

import { LegalPage } from "@/components/layout/LegalPage";
import { legalDescription } from "@/lib/fondeks/seo";

/** Shown on the page and, trimmed, to a search engine. */
const LEAD =
  "Fondeks'i kullanırken hangi verileri topladığımızı, bu verileri neden işlediğimizi ve nasıl sakladığımızı bu sayfada açıklıyoruz.";

export const metadata: Metadata = {
  title: "Gizlilik Sözleşmesi",
  description: legalDescription(LEAD),
};

export default function Page() {
  return <LegalPage title="Gizlilik Sözleşmesi" lead={LEAD} />;
}
