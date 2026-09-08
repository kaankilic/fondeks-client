import type { Metadata } from "next";

import { GuideGrid } from "@/components/guides/GuideList";
import { Page, PageBody, SubHeader } from "@/components/layout/Shell";
import { getGuides } from "@/lib/fondeks/queries";
import { ogMeta, twitterMeta } from "@/lib/fondeks/seo";

const TITLE = "Rehber";
const DESCRIPTION =
  "Yatırım fonlarının nasıl çalıştığını anlatan kısa rehber içerikleri.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "yatırım rehberi",
    "fon rehberi",
    "fon eğitimi",
    "yatırım fonu nedir",
  ],
  openGraph: ogMeta(TITLE, DESCRIPTION),
  twitter: twitterMeta(TITLE, DESCRIPTION),
};

export default async function GuideIndexPage() {
  const guides = await getGuides();

  return (
    <Page>
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
