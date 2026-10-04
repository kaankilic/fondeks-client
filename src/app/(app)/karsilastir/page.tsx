import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CompareTable } from "@/components/fund-detail/CompareTable";
import { ComparePicker, MAX_FUNDS } from "@/components/fund-detail/ComparePicker";
import { JsonLd } from "@/components/layout/JsonLd";
import { Page, PageBody, SubHeader } from "@/components/layout/Shell";
import { getCurrentUser } from "@/lib/auth/session";
import { compareRows } from "@/lib/fondeks/compare";
import { getFund } from "@/lib/fondeks/queries";
import { breadcrumbSchema, webPageSchema } from "@/lib/fondeks/schema";
import { ogMeta, twitterMeta } from "@/lib/fondeks/seo";
import type { Fund } from "@/lib/fondeks/types";

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

/** `?fonlar=AFT,IYB` → up to {@link MAX_FUNDS} unique, upper-cased codes. */
function parseCodes(raw: string | string[] | undefined): string[] {
  const value = Array.isArray(raw) ? raw.join(",") : (raw ?? "");
  const seen = new Set<string>();
  for (const part of value.split(",")) {
    const code = part.trim().toUpperCase();
    if (code) seen.add(code);
    if (seen.size >= MAX_FUNDS) break;
  }
  return [...seen];
}

export default async function ComparePage({
  searchParams,
}: PageProps<"/karsilastir">) {
  const { fonlar } = await searchParams;

  // Compare is an account feature: send visitors to log in, then back here.
  const user = await getCurrentUser();
  if (!user) {
    const raw = Array.isArray(fonlar) ? fonlar.join(",") : fonlar;
    const back = raw ? `/karsilastir?fonlar=${raw}` : "/karsilastir";
    redirect(`/giris?next=${encodeURIComponent(back)}`);
  }

  const codes = parseCodes(fonlar);
  const resolved = await Promise.all(codes.map((code) => getFund(code)));
  const funds = resolved.filter((fund): fund is Fund => fund !== null);

  return (
    <Page>
      <JsonLd data={webPageSchema(TITLE, DESCRIPTION, "/karsilastir")} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Keşfet", href: "/" },
          { name: "Karşılaştır", href: "/karsilastir" },
        ])}
      />

      <SubHeader title="Karşılaştır" />
      <PageBody>
        <ComparePicker
          selected={funds.map((fund) => ({ code: fund.code, name: fund.name }))}
        />

        <CompareTable
          codes={funds.map((fund) => fund.code)}
          rows={compareRows(funds)}
          title="Karşılaştırma"
          hint={funds.map((fund) => fund.code).join(" · ")}
          emptyLabel={
            funds.length === 1
              ? "Karşılaştırmak için ikinci bir fon ekle."
              : "Karşılaştırmak için yukarıdan en az iki fon seç."
          }
        />
      </PageBody>
    </Page>
  );
}
