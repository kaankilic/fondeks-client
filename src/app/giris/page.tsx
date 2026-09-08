import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
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

export default function LoginPage() {
  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
}
