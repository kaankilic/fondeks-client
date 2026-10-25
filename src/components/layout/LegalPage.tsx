import type { LegalDocument } from "@/lib/legal/content";
import { ENTITY, LEGAL_REVISION_DATE, isEntityReady } from "@/lib/legal/entity";

import { Page, PageBody, SubHeader } from "./Shell";
import styles from "./LegalPage.module.scss";

/**
 * Shell for the footer's legal pages. The page renders a structured legal
 * document (lead + numbered sections + entity contact block). The content is
 * a defensible first draft but still subject to counsel review — a visible
 * notice at the top of every page says so, so no one reads the draft as
 * final text.
 */
export function LegalPage({ document }: { document: LegalDocument }) {
  const ready = isEntityReady();

  return (
    <Page>
      <SubHeader
        title={document.title}
        subtitle={`Son güncelleme: ${LEGAL_REVISION_DATE} · Fondeks yasal bilgilendirme`}
      />
      <PageBody>
        <article className={styles.panel}>
          <p className={styles.lead}>{document.lead}</p>

          <nav className={styles.toc} aria-label="İçindekiler">
            <h2 className={styles.tocTitle}>İçindekiler</h2>
            <ol className={styles.tocList}>
              {document.sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className={styles.tocLink}>
                    {section.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {document.sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className={styles.section}
            >
              <h2 className={styles.sectionHeading}>{section.heading}</h2>
              {section.body.map((paragraph, i) => (
                <p key={i} className={styles.paragraph}>
                  {paragraph}
                </p>
              ))}
            </section>
          ))}

          <section
            id="veri-sorumlusu-iletisim"
            className={styles.section}
            aria-labelledby="veri-sorumlusu-iletisim-h"
          >
            <h2
              id="veri-sorumlusu-iletisim-h"
              className={styles.sectionHeading}
            >
              Veri Sorumlusu / Hizmet Sağlayıcı
            </h2>
            {ready ? (
              <dl className={styles.entity}>
                <dt>Ticari Ünvan</dt>
                <dd>{ENTITY.commercialName}</dd>
                <dt>MERSİS No</dt>
                <dd>{ENTITY.mersisNo}</dd>
                <dt>Vergi Dairesi / No</dt>
                <dd>
                  {ENTITY.taxOffice} · {ENTITY.taxNo}
                </dd>
                <dt>Yerleşim Adresi</dt>
                <dd>{ENTITY.address}</dd>
                <dt>KEP</dt>
                <dd>{ENTITY.kep}</dd>
                <dt>İletişim</dt>
                <dd>{ENTITY.email}</dd>
                <dt>KVKK Başvuruları</dt>
                <dd>{ENTITY.kvkkContact}</dd>
                {ENTITY.phone ? (
                  <>
                    <dt>Telefon</dt>
                    <dd>{ENTITY.phone}</dd>
                  </>
                ) : null}
              </dl>
            ) : (
              <p className={styles.pending}>
                Veri sorumlusu / hizmet sağlayıcı kimlik bilgileri lansmandan
                önce doldurulacaktır. Soru ve başvuruların için{" "}
                <a href={`mailto:${ENTITY.kvkkContact}`}>
                  {ENTITY.kvkkContact}
                </a>{" "}
                adresine yazabilirsin.
              </p>
            )}
          </section>
        </article>
      </PageBody>
    </Page>
  );
}
