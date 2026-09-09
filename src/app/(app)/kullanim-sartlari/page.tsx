import type { Metadata } from "next";

import { JsonLd } from "@/components/layout/JsonLd";
import { LegalPage } from "@/components/layout/LegalPage";
import { breadcrumbSchema, webPageSchema } from "@/lib/fondeks/schema";
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
  return (
    <>
      <JsonLd data={webPageSchema(TITLE, DESCRIPTION, "/kullanim-sartlari")} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Keşfet", href: "/" },
          { name: TITLE, href: "/kullanim-sartlari" },
        ])}
      />
      <LegalPage title="Kullanım Şartları" lead={LEAD} />
    </>
  );
}
