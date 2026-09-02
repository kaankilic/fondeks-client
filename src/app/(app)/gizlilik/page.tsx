import type { Metadata } from "next";

import { LegalPage } from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "Gizlilik Sözleşmesi" };

export default function Page() {
  return (
    <LegalPage
      title="Gizlilik Sözleşmesi"
      lead="Fondeks'i kullanırken hangi verileri topladığımızı, bu verileri neden işlediğimizi ve nasıl sakladığımızı bu sayfada açıklıyoruz."
    />
  );
}
