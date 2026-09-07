import { UNKNOWN } from "@/lib/fondeks/constants";
import { formatPercentPrefixed } from "@/lib/fondeks/format";
import { riskTone } from "@/lib/fondeks/palette";
import type { Fund } from "@/lib/fondeks/types";

import styles from "./FundFacts.module.scss";

/** Settlement lag, written the way fund factsheets write it. */
function valueDate(days: number | null): string {
  return days === null ? UNKNOWN : `T+${days}`;
}

export function FundFacts({ fund }: { fund: Fund }) {
  const tone = fund.risk === null ? null : riskTone(fund.risk);

  const facts = [
    { label: "Kurucu", value: fund.founder, text: true },
    {
      label: "Yıllık Yönetim Ücreti",
      value: formatPercentPrefixed(fund.managementFee, 2),
    },
    {
      label: "Stopaj Oranı",
      value:
        fund.withholdingTax === null
          ? UNKNOWN
          : formatPercentPrefixed(fund.withholdingTax, 0),
      unknown: fund.withholdingTax === null,
    },
    {
      label: "Risk Değeri",
      value: fund.risk === null ? UNKNOWN : `${fund.risk} / 7`,
      color: tone?.color,
      unknown: fund.risk === null,
    },
    {
      label: "Alış Valörü",
      value: valueDate(fund.buyValueDays),
      unknown: fund.buyValueDays === null,
    },
    {
      label: "Satış Valörü",
      value: valueDate(fund.sellValueDays),
      unknown: fund.sellValueDays === null,
    },
  ];

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.title}>Fon Bilgileri</span>
        {/* Null is not a "no": an ETF is bought on BIST, so TEFAS says
            nothing about it and the badge stays off the page entirely. */}
        {fund.onTefas === null ? null : (
          <span
            className={`${styles.tefas} ${
              fund.onTefas ? styles.tefasOn : styles.tefasOff
            }`}
          >
            {fund.onTefas ? "TEFAS'ta işlem görür" : "TEFAS'ta işlem görmez"}
          </span>
        )}
      </div>

      <div className={styles.grid}>
        {facts.map((fact) => (
          <div key={fact.label} className={styles.cell}>
            <div className={styles.label}>{fact.label}</div>
            <div
              className={`${styles.value} ${fact.text ? styles.text : ""} ${
                fact.unknown ? styles.unknown : ""
              }`}
              style={fact.color ? { color: fact.color } : undefined}
            >
              {fact.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
