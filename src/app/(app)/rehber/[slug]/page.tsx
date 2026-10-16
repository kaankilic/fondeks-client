import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/layout/JsonLd";
import { Page, PageBody, SubHeader } from "@/components/layout/Shell";
import { ScrollDepthTracker } from "@/lib/analytics/ScrollDepthTracker";
import { TrackView } from "@/lib/analytics/Track";
import { getGuide, getGuides } from "@/lib/fondeks/queries";
import { breadcrumbSchema, guideArticleSchema } from "@/lib/fondeks/schema";
import { ogMeta, twitterMeta } from "@/lib/fondeks/seo";

import styles from "./guide.module.scss";

export async function generateMetadata({
  params,
}: PageProps<"/rehber/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getGuide(slug);

  if (!guide) return { title: "Rehber" };

  return {
    title: guide.title,
    description: guide.summary,
    keywords: [guide.title, guide.category, "yatırım rehberi"],
    openGraph: ogMeta(guide.title, guide.summary),
    twitter: twitterMeta(guide.title, guide.summary),
  };
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
      <JsonLd data={guideArticleSchema(guide)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Keşfet", href: "/" },
          { name: "Rehber", href: "/rehber" },
          { name: guide.title, href: `/rehber/${guide.slug}` },
        ])}
      />

      <TrackView event="guide_viewed" params={{ slug: guide.slug }} />
      <ScrollDepthTracker kind="guide" slug={guide.slug} />

      <SubHeader
        title={guide.title}
        subtitle={`${guide.category} · ${guide.readingMinutes} dk okuma`}
      />

      <PageBody>
        <article className={styles.article}>
          <p className={styles.lead}>{guide.summary}</p>

          {/* Sanitised server-side in getGuide() against an allowlist. */}
          <div
            className={styles.body}
            dangerouslySetInnerHTML={{ __html: guide.bodyHtml }}
          />

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
