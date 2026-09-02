import { formatPercentPrefixed } from "@/lib/fondeks/format";
import { riskTone } from "@/lib/fondeks/palette";
import type { Fund } from "@/lib/fondeks/types";

import styles from "./FundFacts.module.scss";

/** Settlement lag, written the way fund factsheets write it. */
function valueDate(days: number): string {
  return `T+${days}`;
}

export function FundFacts({ fund }: { fund: Fund }) {
  const tone = riskTone(fund.risk);

  const facts = [
    { label: "Kurucu", value: fund.founder, text: true },
    {
      label: "Yıllık Yönetim Ücreti",
      value: formatPercentPrefixed(fund.managementFee, 2),
    },
    {
      label: "Stopaj Oranı",
      value: formatPercentPrefixed(fund.withholdingTax, 0),
    },
    {
      label: "Risk Değeri",
      value: `${fund.risk} / 7`,
      color: tone.color,
    },
    { label: "Alış Valörü", value: valueDate(fund.buyValueDays) },
    { label: "Satış Valörü", value: valueDate(fund.sellValueDays) },
  ];

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.title}>Fon Bilgileri</span>
        <span
          className={`${styles.tefas} ${
            fund.onTefas ? styles.tefasOn : styles.tefasOff
          }`}
        >
          {fund.onTefas ? "TEFAS'ta işlem görür" : "TEFAS'ta işlem görmez"}
        </span>
      </div>

      <div className={styles.grid}>
        {facts.map((fact) => (
          <div key={fact.label} className={styles.cell}>
            <div className={styles.label}>{fact.label}</div>
            <div
              className={`${styles.value} ${fact.text ? styles.text : ""}`}
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
