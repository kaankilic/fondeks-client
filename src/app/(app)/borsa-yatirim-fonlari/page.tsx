import type { Metadata } from "next";

import { FundTable, type CategoryTab } from "@/components/funds/FundTable";
import { Page, PageBody, SubHeader } from "@/components/layout/Shell";
import { formatCount } from "@/lib/fondeks/format";
import { getEtfFunds } from "@/lib/fondeks/queries";
import { ogMeta, twitterMeta } from "@/lib/fondeks/seo";

const TITLE = "Borsa Yatırım Fonları";
const DESCRIPTION =
  "Borsa İstanbul'da işlem gören yatırım fonlarının güncel fiyatları, " +
  "getirileri ve fon büyüklükleri — kategoriye göre filtrelenebilir liste.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["borsa yatırım fonu", "BYF", "ETF", "BIST fon", "hisse fonu"],
  openGraph: ogMeta(TITLE, DESCRIPTION),
  twitter: twitterMeta(TITLE, DESCRIPTION),
};

/**
 * The universe is 37 funds and almost all of them track an index or a metal,
 * so the shortcuts are the three things one can actually hold.
 */
const TABS: CategoryTab[] = [
  { label: "Tümü", category: null },
  { label: "Hisse", category: "Hisse Senedi" },
  { label: "Endeks", category: "Endeks" },
  { label: "Maden", category: "Kıymetli Maden" },
];

export default async function EtfFundsPage() {
  const funds = await getEtfFunds();

  return (
    <Page>
      <SubHeader
        title="Borsa Yatırım Fonları"
        subtitle={`${formatCount(funds.length)} fon · getiriye göre sıralı`}
      />

      <PageBody>
        <FundTable
          funds={funds}
          title="Borsa Yatırım Fonları"
          tabs={TABS}
          showFounder
          wide
        />
      </PageBody>
    </Page>
  );
}
