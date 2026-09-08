import type { Metadata } from "next";

import { LegalPage } from "@/components/layout/LegalPage";
import { legalDescription, ogMeta, twitterMeta } from "@/lib/fondeks/seo";

/** Shown on the page and, trimmed, to a search engine. */
const LEAD =
  "6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri sorumlusu sıfatıyla kişisel verilerinin işlenme amaçlarını ve haklarını bu sayfada bulabilirsin.";

const TITLE = "KVKK Aydınlatma Metni";
const DESCRIPTION = legalDescription(LEAD);

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["KVKK", "kişisel veri", "aydınlatma metni", "veri sorumlusu"],
  openGraph: ogMeta(TITLE, DESCRIPTION),
  twitter: twitterMeta(TITLE, DESCRIPTION),
};

export default function Page() {
  return <LegalPage title="KVKK Aydınlatma Metni" lead={LEAD} />;
}
