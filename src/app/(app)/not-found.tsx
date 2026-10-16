import type { Metadata } from "next";

import { NotFoundScreen } from "@/components/layout/NotFoundScreen";
import { NotFoundTracker } from "@/components/layout/NotFoundTracker";
import { Page } from "@/components/layout/Shell";

export const metadata: Metadata = { title: "Sayfa bulunamadı" };

export default function NotFound() {
  return (
    <Page>
      <NotFoundTracker />
      <NotFoundScreen />
    </Page>
  );
}
