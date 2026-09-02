import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Page, PageBody, SubHeader } from "@/components/layout/Shell";
import { getGuide, getGuides } from "@/lib/fondeks/queries";

import styles from "./guide.module.scss";

export async function generateMetadata({
  params,
}: PageProps<"/rehber/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getGuide(slug);

  if (!guide) return { title: "Rehber" };
  return { title: guide.title, description: guide.summary };
}

export default async function GuidePage({
  params,
}: PageProps<"/rehber/[slug]">) {
  const { slug } = await params;
  const [guide, others] = await Promise.all([getGuide(slug), getGuides(4)]);

  if (!guide) notFound();

  const related = others.filter((item) => item.slug !== guide.slug).slice(0, 3);

  return (
    <Page>
      <SubHeader
        title={guide.title}
        subtitle={`${guide.category} · ${guide.readingMinutes} dk okuma`}
      />

      <PageBody>
        <article className={styles.article}>
          <p className={styles.lead}>{guide.summary}</p>

          {guide.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className={styles.paragraph}>
              {paragraph}
            </p>
          ))}

          <p className={styles.note}>
            Bu içerik genel bilgilendirme amaçlıdır; yatırım danışmanlığı
            kapsamında değildir.
          </p>
        </article>

        {related.length > 0 ? (
          <section className={styles.related}>
            <span className={styles.relatedTitle}>Diğer içerikler</span>
            <div className={styles.relatedLinks}>
              {related.map((item) => (
                <Link
                  key={item.slug}
                  href={`/rehber/${item.slug}`}
                  className={styles.relatedLink}
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </PageBody>
    </Page>
  );
}
