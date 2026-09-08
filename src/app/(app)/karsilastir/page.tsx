import type { Metadata } from "next";

import { ComingSoon } from "@/components/layout/ComingSoon";
import { Page, PageBody, SubHeader } from "@/components/layout/Shell";
import { ogMeta, twitterMeta } from "@/lib/fondeks/seo";

const TITLE = "Karşılaştır";
const DESCRIPTION =
  "Birden fazla yatırım fonunun getiri, risk ve maliyet verilerini yan yana karşılaştır.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "fon karşılaştırma",
    "fon performans karşılaştırma",
    "getiri karşılaştırma",
  ],
  openGraph: ogMeta(TITLE, DESCRIPTION),
  twitter: twitterMeta(TITLE, DESCRIPTION),
};

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
