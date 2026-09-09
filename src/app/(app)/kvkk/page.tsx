import type { Metadata } from "next";

import { JsonLd } from "@/components/layout/JsonLd";
import { LegalPage } from "@/components/layout/LegalPage";
import { breadcrumbSchema, webPageSchema } from "@/lib/fondeks/schema";
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
  return (
    <>
      <JsonLd data={webPageSchema(TITLE, DESCRIPTION, "/kvkk")} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Keşfet", href: "/" },
          { name: TITLE, href: "/kvkk" },
        ])}
      />
      <LegalPage title="KVKK Aydınlatma Metni" lead={LEAD} />
    </>
  );
}
