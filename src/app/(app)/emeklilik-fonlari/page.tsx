import type { Metadata } from "next";

import { FundTable, type CategoryTab } from "@/components/funds/FundTable";
import { JsonLd } from "@/components/layout/JsonLd";
import { Page, PageBody, SubHeader } from "@/components/layout/Shell";
import { formatCount } from "@/lib/fondeks/format";
import { getPensionFunds } from "@/lib/fondeks/queries";
import { breadcrumbSchema, fundCollectionSchema } from "@/lib/fondeks/schema";
import { ogMeta, twitterMeta } from "@/lib/fondeks/seo";

const TITLE = "Emeklilik Fonları";
const DESCRIPTION =
  "Bireysel emeklilik sistemindeki yatırım fonlarının güncel fiyatları, " +
  "getirileri ve fon büyüklükleri — kategoriye göre filtrelenebilir liste.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "emeklilik fonu",
    "BES",
    "bireysel emeklilik",
    "emeklilik yatırım fonu",
  ],
  openGraph: ogMeta(TITLE, DESCRIPTION),
  twitter: twitterMeta(TITLE, DESCRIPTION),
};

/**
 * The shortcuts a pension saver actually navigates by. Standart, Katkı and
 * Başlangıç are the funds a plan places contributions in by default, so they
 * lead; the asset-class tabs the securities table opens with would answer a
 * different question here.
 */
const TABS: CategoryTab[] = [
  { label: "Tümü", category: null },
  { label: "Standart", category: "Standart" },
  { label: "Katkı", category: "Katkı" },
  { label: "Değişken", category: "Değişken" },
  { label: "Hisse", category: "Hisse Senedi" },
];

export default async function PensionFundsPage() {
  const funds = await getPensionFunds();

  return (
    <Page>
      <JsonLd
        data={fundCollectionSchema(
          TITLE,
          DESCRIPTION,
          "/emeklilik-fonlari",
          funds,
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Keşfet", href: "/" },
          { name: TITLE, href: "/emeklilik-fonlari" },
        ])}
      />

      <SubHeader
        title="Emeklilik Fonları"
        subtitle={`${formatCount(funds.length)} fon · getiriye göre sıralı`}
      />

      <PageBody>
        <FundTable
          funds={funds}
          title="Emeklilik Yatırım Fonları"
          tabs={TABS}
          showFounder
          wide
        />
      </PageBody>
    </Page>
  );
}
