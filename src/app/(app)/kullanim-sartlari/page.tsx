import type { Metadata } from "next";

import { LegalPage } from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "Kullanım Şartları" };

export default function Page() {
  return (
    <LegalPage
      title="Kullanım Şartları"
      lead="Fondeks hesabını kullanırken geçerli olan koşullar, hizmet kapsamı ve sorumluluk sınırları bu sayfada yer alır."
    />
  );
}
