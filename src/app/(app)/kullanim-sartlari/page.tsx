import type { Metadata } from "next";

import { JsonLd } from "@/components/layout/JsonLd";
import { LegalPage } from "@/components/layout/LegalPage";
import { breadcrumbSchema, webPageSchema } from "@/lib/fondeks/schema";
import {
  canonicalMeta,
  legalDescription,
  ogMeta,
  twitterMeta,
} from "@/lib/fondeks/seo";
import { KULLANIM_SARTLARI } from "@/lib/legal/content";

const TITLE = KULLANIM_SARTLARI.title;
const PATH = "/kullanim-sartlari";
const DESCRIPTION = legalDescription(KULLANIM_SARTLARI.lead);
const canonical = canonicalMeta(PATH);

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["kullanım şartları", "hizmet koşulları"],
  alternates: canonical.alternates,
  openGraph: { ...ogMeta(TITLE, DESCRIPTION, PATH), ...canonical.openGraph },
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
