import type { Fund, Guide, GuideDetail } from "./types";
import { formatPercentPrefixed } from "./format";
import { absoluteUrl, siteUrl } from "./site";

type JsonLdObject = Record<string, unknown>;

const ORG: JsonLdObject = {
  "@type": "Organization",
  name: "Fondeks",
  url: siteUrl(),
  logo: absoluteUrl("/icon.svg"),
  contactPoint: {
    "@type": "ContactPoint",
    email: "info@fondeks.com",
    contactType: "customer service",
  },
};

export function websiteSchema(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Fondeks",
    url: siteUrl(),
    inLanguage: "tr",
    publisher: ORG,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl()}/arama?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbSchema(
  items: { name: string; href: string }[],
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.href),
    })),
  };
}

export function webPageSchema(
  title: string,
  description: string,
  path: string,
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: absoluteUrl(path),
    inLanguage: "tr",
    isPartOf: { "@type": "WebSite", url: siteUrl() },
  };
}

export function fundSchema(fund: Fund): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    name: fund.name,
    description: `${fund.name} (${fund.code}) — ${fund.category} · ${fund.founder}`,
    url: absoluteUrl(`/fon/${fund.slug}`),
    provider: {
      "@type": "Organization",
      name: fund.founder,
    },
    category: fund.category,
    feesAndCommissionsSpecification: `Yıllık yönetim ücreti: ${formatPercentPrefixed(fund.managementFee, 2)}`,
    ...(fund.isin ? { identifier: fund.isin } : {}),
  };
}

export function fundCollectionSchema(
  title: string,
  description: string,
  path: string,
  funds: Fund[],
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    url: absoluteUrl(path),
    inLanguage: "tr",
    isPartOf: { "@type": "WebSite", url: siteUrl() },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: funds.length,
      itemListElement: funds.slice(0, 10).map((fund, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: `${fund.code} — ${fund.name}`,
        url: absoluteUrl(`/fon/${fund.slug}`),
      })),
    },
  };
}

export function guideListSchema(guides: Guide[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Rehber",
    description:
      "Yatırım fonlarının nasıl çalıştığını anlatan kısa rehber içerikleri.",
    url: absoluteUrl("/rehber"),
    inLanguage: "tr",
    isPartOf: { "@type": "WebSite", url: siteUrl() },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: guides.length,
      itemListElement: guides.map((guide, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: guide.title,
        url: absoluteUrl(`/rehber/${guide.slug}`),
      })),
    },
  };
}

export function guideArticleSchema(guide: GuideDetail): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.summary,
    url: absoluteUrl(`/rehber/${guide.slug}`),
    inLanguage: "tr",
    articleSection: guide.category,
    wordCount: guide.paragraphs.join(" ").split(/\s+/).length,
    datePublished: guide.publishedAt.toISOString(),
    publisher: ORG,
    isPartOf: { "@type": "WebSite", url: siteUrl() },
  };
}
