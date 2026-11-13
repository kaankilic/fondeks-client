import type { ReactNode } from "react";

import { Footer } from "@/components/layout/Footer";
import { TopNav } from "@/components/layout/TopNav";
import { IdentifyUser } from "@/lib/analytics/IdentifyUser";

import { Shell } from "./Shell";
import styles from "./layout.module.scss";

/**
 * Session is deliberately NOT read here. Reading cookies at the layout level
 * marks every page below it dynamic, which blocks Vercel's edge cache and
 * sends Googlebot into a cold render on every crawl. `TopNav` and
 * `IdentifyUser` fetch `/api/session` on the client once the shell is in
 * view; the public pages stay stateless at render time.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Shell>
      <IdentifyUser />
      <TopNav />
      <main className={styles.main}>{children}</main>
      <Footer />
    </Shell>
  );
}
