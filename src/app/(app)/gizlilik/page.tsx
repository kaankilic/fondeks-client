import type { Metadata } from "next";

import { JsonLd } from "@/components/layout/JsonLd";
import { LegalPage } from "@/components/layout/LegalPage";
import { breadcrumbSchema, webPageSchema } from "@/lib/fondeks/schema";
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
  return (
    <>
      <JsonLd data={webPageSchema(TITLE, DESCRIPTION, "/gizlilik")} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Keşfet", href: "/" },
          { name: TITLE, href: "/gizlilik" },
        ])}
      />
      <LegalPage title="Gizlilik Sözleşmesi" lead={LEAD} />
    </>
  );
}
