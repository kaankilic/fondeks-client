import type { ReactNode } from "react";

import { Footer } from "@/components/layout/Footer";
import { TopNav } from "@/components/layout/TopNav";
import { getCurrentUser } from "@/lib/auth/session";

import { Shell } from "./Shell";
import styles from "./layout.module.scss";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <Shell>
      <TopNav user={user} />
      <main className={styles.main}>{children}</main>
      <Footer />
    </Shell>
  );
}
