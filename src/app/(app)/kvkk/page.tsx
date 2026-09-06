import type { Metadata } from "next";

import { LegalPage } from "@/components/layout/LegalPage";
import { legalDescription } from "@/lib/fondeks/seo";

/** Shown on the page and, trimmed, to a search engine. */
const LEAD =
  "6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri sorumlusu sıfatıyla kişisel verilerinin işlenme amaçlarını ve haklarını bu sayfada bulabilirsin.";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni",
  description: legalDescription(LEAD),
};

export default function Page() {
  return <LegalPage title="KVKK Aydınlatma Metni" lead={LEAD} />;
}
