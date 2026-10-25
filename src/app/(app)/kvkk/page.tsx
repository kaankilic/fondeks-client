import type { Metadata } from "next";

import { JsonLd } from "@/components/layout/JsonLd";
import { LegalPage } from "@/components/layout/LegalPage";
import { breadcrumbSchema, webPageSchema } from "@/lib/fondeks/schema";
import { legalDescription, ogMeta, twitterMeta } from "@/lib/fondeks/seo";
import { KVKK_AYDINLATMA } from "@/lib/legal/content";

const TITLE = KVKK_AYDINLATMA.title;
const DESCRIPTION = legalDescription(KVKK_AYDINLATMA.lead);

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
      <LegalPage document={KVKK_AYDINLATMA} />
    </>
  );
}
