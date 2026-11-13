import type { Metadata } from "next";

import { GuideGrid } from "@/components/guides/GuideList";
import { JsonLd } from "@/components/layout/JsonLd";
import { Page, PageBody, SubHeader } from "@/components/layout/Shell";
import { getGuides } from "@/lib/fondeks/queries";
import { breadcrumbSchema, guideListSchema } from "@/lib/fondeks/schema";
import { canonicalMeta, ogMeta, twitterMeta } from "@/lib/fondeks/seo";

const TITLE = "Rehber";
const PATH = "/rehber";
const DESCRIPTION =
  "Yatırım fonlarının nasıl çalıştığını anlatan kısa rehber içerikleri.";

const canonical = canonicalMeta(PATH);

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "yatırım rehberi",
    "fon rehberi",
    "fon eğitimi",
    "yatırım fonu nedir",
  ],
  alternates: canonical.alternates,
  openGraph: { ...ogMeta(TITLE, DESCRIPTION, PATH), ...canonical.openGraph },
  twitter: twitterMeta(TITLE, DESCRIPTION),
};

export default async function GuideIndexPage() {
  const guides = await getGuides();

  return (
    <Page>
      <JsonLd data={guideListSchema(guides)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Keşfet", href: "/" },
          { name: "Rehber", href: "/rehber" },
        ])}
      />

      <SubHeader
        title="Rehber"
        subtitle="Fonların nasıl çalıştığını anlatan kısa içerikler"
      />
      <PageBody>
        <GuideGrid guides={guides} />
      </PageBody>
    </Page>
  );
}
