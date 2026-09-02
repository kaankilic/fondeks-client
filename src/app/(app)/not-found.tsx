import type { Metadata } from "next";

import { NotFoundScreen } from "@/components/layout/NotFoundScreen";
import { Page } from "@/components/layout/Shell";

export const metadata: Metadata = { title: "Sayfa bulunamadı" };

export default function NotFound() {
  return (
    <Page>
      <NotFoundScreen />
    </Page>
  );
}
