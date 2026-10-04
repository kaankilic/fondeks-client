import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { JsonLd } from "@/components/layout/JsonLd";
import { webPageSchema } from "@/lib/fondeks/schema";
import { ogMeta, twitterMeta } from "@/lib/fondeks/seo";

const TITLE = "Giriş";
const DESCRIPTION =
  "Fondeks hesabına giriş yap, portföyünü ve izleme listeni görüntüle.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["fondeks giriş", "hesap giriş"],
  openGraph: ogMeta(TITLE, DESCRIPTION),
  twitter: twitterMeta(TITLE, DESCRIPTION),
};

export default async function LoginPage({
  searchParams,
}: PageProps<"/giris">) {
  const { next } = await searchParams;
  const safeNext =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : undefined;

  return (
    <>
      <JsonLd data={webPageSchema(TITLE, DESCRIPTION, "/giris")} />
      <AuthShell>
        <LoginForm next={safeNext} />
      </AuthShell>
    </>
  );
}
