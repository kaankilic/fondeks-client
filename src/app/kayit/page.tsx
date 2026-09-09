import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { JsonLd } from "@/components/layout/JsonLd";
import { webPageSchema } from "@/lib/fondeks/schema";
import { ogMeta, twitterMeta } from "@/lib/fondeks/seo";

const TITLE = "Kayıt Ol";
const DESCRIPTION =
  "Ücretsiz Fondeks hesabı oluştur, fon analizlerine ve izleme listesine eriş.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["fondeks kayıt", "hesap oluştur", "ücretsiz kayıt"],
  openGraph: ogMeta(TITLE, DESCRIPTION),
  twitter: twitterMeta(TITLE, DESCRIPTION),
};

export default function RegisterPage() {
  return (
    <>
      <JsonLd data={webPageSchema(TITLE, DESCRIPTION, "/kayit")} />
      <AuthShell>
        <RegisterForm />
      </AuthShell>
    </>
  );
}
