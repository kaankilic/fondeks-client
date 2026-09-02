import type { Metadata } from "next";

import { ComingSoon } from "@/components/layout/ComingSoon";
import { Page, PageBody, SubHeader } from "@/components/layout/Shell";

export const metadata: Metadata = { title: "Karşılaştır" };

export default function ComingSoonPage() {
  return (
    <Page>
      <SubHeader title="Karşılaştır" />
      <PageBody>
        <ComingSoon screen="Karşılaştır" />
      </PageBody>
    </Page>
  );
}
