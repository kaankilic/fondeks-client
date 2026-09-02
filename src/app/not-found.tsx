import type { Metadata } from "next";

import { Footer } from "@/components/layout/Footer";
import { NotFoundScreen } from "@/components/layout/NotFoundScreen";
import { Page } from "@/components/layout/Shell";
import { TopNav } from "@/components/layout/TopNav";
import { getCurrentUser } from "@/lib/auth/session";

import styles from "./not-found.module.scss";

export const metadata: Metadata = { title: "Sayfa bulunamadı" };

/**
 * Global 404 for unmatched URLs. It sits outside the (app) group, so it brings
 * its own header and footer to keep the chrome identical to every other page.
 */
export default async function NotFound() {
  const user = await getCurrentUser();

  return (
    <div className={styles.shell}>
      <TopNav user={user} />
      <main className={styles.main}>
        <Page>
          <NotFoundScreen />
        </Page>
      </main>
      <Footer />
    </div>
  );
}
