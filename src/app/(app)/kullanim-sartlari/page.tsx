import type { Metadata } from "next";

import { JsonLd } from "@/components/layout/JsonLd";
import { LegalPage } from "@/components/layout/LegalPage";
import { breadcrumbSchema, webPageSchema } from "@/lib/fondeks/schema";
import { legalDescription, ogMeta, twitterMeta } from "@/lib/fondeks/seo";
import { KULLANIM_SARTLARI } from "@/lib/legal/content";

const TITLE = KULLANIM_SARTLARI.title;
const DESCRIPTION = legalDescription(KULLANIM_SARTLARI.lead);

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
      <LegalPage document={KULLANIM_SARTLARI} />
    </>
  );
}
