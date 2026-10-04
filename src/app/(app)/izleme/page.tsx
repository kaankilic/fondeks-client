import type { Metadata } from "next";

import { SignupGate } from "@/components/fund-detail/SignupGate";
import { WatchlistTable } from "@/components/fund-detail/WatchlistTable";
import { JsonLd } from "@/components/layout/JsonLd";
import { Page, PageBody, SubHeader } from "@/components/layout/Shell";
import { getCurrentUser } from "@/lib/auth/session";
import { getWatchlistFunds } from "@/lib/watchlist/queries";
import { breadcrumbSchema, webPageSchema } from "@/lib/fondeks/schema";
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
  const funds = user ? await getWatchlistFunds(user.id) : [];

  return (
    <Page>
      <JsonLd data={webPageSchema(TITLE, DESCRIPTION, "/izleme")} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Keşfet", href: "/" },
          { name: "İzleme Listem", href: "/izleme" },
        ])}
      />

      <SubHeader title="İzleme Listem" />
      <PageBody>
        {/* A watchlist belongs to an account, so visitors meet the wall first. */}
        {user ? (
          <WatchlistTable funds={funds} />
        ) : (
          <SignupGate preset="watchlist" />
        )}
      </PageBody>
    </Page>
  );
}
