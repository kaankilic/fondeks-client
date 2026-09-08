import type { Metadata } from "next";

import { SignupGate } from "@/components/fund-detail/SignupGate";
import { ComingSoon } from "@/components/layout/ComingSoon";
import { Page, PageBody, SubHeader } from "@/components/layout/Shell";
import { getCurrentUser } from "@/lib/auth/session";
import { ogMeta, twitterMeta } from "@/lib/fondeks/seo";

const TITLE = "İzleme Listem";
const DESCRIPTION =
  "Beğendiğin fonları izleme listene ekle, getirilerini ve değişimlerini tek sayfadan takip et.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["izleme listesi", "fon takip", "favori fonlar"],
  openGraph: ogMeta(TITLE, DESCRIPTION),
  twitter: twitterMeta(TITLE, DESCRIPTION),
};

export default async function WatchlistPage() {
  const user = await getCurrentUser();

  return (
    <Page>
      <SubHeader title="İzleme Listem" />
      <PageBody>
        {/* A watchlist belongs to an account, so visitors meet the wall first. */}
        {user ? (
          <ComingSoon screen="İzleme Listem" />
        ) : (
          <SignupGate preset="watchlist" />
        )}
      </PageBody>
    </Page>
  );
}
