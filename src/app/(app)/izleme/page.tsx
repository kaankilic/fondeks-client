import type { Metadata } from "next";

import { SignupGate } from "@/components/fund-detail/SignupGate";
import { ComingSoon } from "@/components/layout/ComingSoon";
import { Page, PageBody, SubHeader } from "@/components/layout/Shell";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "İzleme Listem" };

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
