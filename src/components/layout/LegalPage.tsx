import { Page, PageBody, SubHeader } from "./Shell";
import styles from "./LegalPage.module.scss";

/**
 * Shell for the footer's legal pages. The binding text has to come from
 * counsel, so each page states plainly that it is not published yet rather
 * than shipping invented terms.
 */
export function LegalPage({
  title,
  lead,
}: {
  title: string;
  lead: string;
}) {
  return (
    <Page>
      <SubHeader title={title} subtitle="Fondeks yasal bilgilendirme" />
      <PageBody>
        <section className={styles.panel}>
          <p className={styles.lead}>{lead}</p>
          <p className={styles.pending}>
            Metnin nihai hâli hazırlanıyor. Yayına almadan önce hukuk onaylı
            sürümle değiştirilmelidir. Sorularını{" "}
            <a href="mailto:info@fondeks.com">info@fondeks.com</a> adresine
            iletebilirsin.
          </p>
        </section>
      </PageBody>
    </Page>
  );
}
