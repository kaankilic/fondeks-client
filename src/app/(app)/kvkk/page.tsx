import type { Metadata } from "next";

import { LegalPage } from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "KVKK Aydınlatma Metni" };

export default function Page() {
  return (
    <LegalPage
      title="KVKK Aydınlatma Metni"
      lead="6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri sorumlusu sıfatıyla kişisel verilerinin işlenme amaçlarını ve haklarını bu sayfada bulabilirsin."
    />
  );
}
