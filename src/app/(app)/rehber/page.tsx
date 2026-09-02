import type { Metadata } from "next";

import { GuideGrid } from "@/components/guides/GuideList";
import { Page, PageBody, SubHeader } from "@/components/layout/Shell";
import { getGuides } from "@/lib/fondeks/queries";

export const metadata: Metadata = {
  title: "Rehber",
  description:
    "Yatırım fonlarının nasıl çalıştığını anlatan kısa rehber içerikleri.",
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
