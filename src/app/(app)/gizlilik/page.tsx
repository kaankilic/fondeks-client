import type { Metadata } from "next";

import { JsonLd } from "@/components/layout/JsonLd";
import { LegalPage } from "@/components/layout/LegalPage";
import { breadcrumbSchema, webPageSchema } from "@/lib/fondeks/schema";
import { legalDescription, ogMeta, twitterMeta } from "@/lib/fondeks/seo";
import { GIZLILIK_SOZLESMESI } from "@/lib/legal/content";

const TITLE = GIZLILIK_SOZLESMESI.title;
const DESCRIPTION = legalDescription(GIZLILIK_SOZLESMESI.lead);

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["gizlilik politikası", "kişisel veri", "veri koruma"],
  openGraph: ogMeta(TITLE, DESCRIPTION),
  twitter: twitterMeta(TITLE, DESCRIPTION),
};

export default function Page() {
  return (
    <>
      <JsonLd data={webPageSchema(TITLE, DESCRIPTION, "/gizlilik")} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Keşfet", href: "/" },
          { name: TITLE, href: "/gizlilik" },
        ])}
      />
      <LegalPage document={GIZLILIK_SOZLESMESI} />
    </>
  );
}
