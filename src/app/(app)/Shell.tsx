"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import styles from "./layout.module.scss";

/**
 * The filter workspace runs as a fixed frame — header and footer always on
 * screen, results scrolling between them. Every other screen scrolls as a
 * normal document, with the footer at the end of the content.
 */
const FIXED_ROUTES = ["/arama"];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const fixed = FIXED_ROUTES.some((route) => pathname.startsWith(route));

  return (
    <div className={`${styles.shell} ${fixed ? styles.fixed : ""}`}>
      {children}
    </div>
  );
}
