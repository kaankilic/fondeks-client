import type { Metadata } from "next";

import { Footer } from "@/components/layout/Footer";
import { NotFoundScreen } from "@/components/layout/NotFoundScreen";
import { NotFoundTracker } from "@/components/layout/NotFoundTracker";
import { Page } from "@/components/layout/Shell";
import { TopNav } from "@/components/layout/TopNav";

import styles from "./not-found.module.scss";

export const metadata: Metadata = { title: "Sayfa bulunamadı" };

/**
 * Global 404 for unmatched URLs. It sits outside the (app) group, so it
 * brings its own header and footer to keep the chrome identical to every
 * other page. Session is resolved on the client by `TopNav` itself so this
 * route stays static — otherwise Next marks 404 dynamic and every unmatched
 * URL becomes a cold render.
 */
export default function NotFound() {
  return (
    <div className={styles.shell}>
      <TopNav />
      <main className={styles.main}>
        <Page>
          <NotFoundTracker />
          <NotFoundScreen />
        </Page>
      </main>
      <Footer />
    </div>
  );
}
