"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";

import { Button, buttonClass } from "@/components/ui/Button";
import { useEvents } from "@/lib/analytics/useEvents";
import { toggleWatch } from "@/lib/watchlist/actions";

import styles from "./FundHeader.module.scss";

/**
 * The fund masthead's two actions. Compare is a link; watch is a server-action
 * toggle. A logged-out visitor is routed to the login screen first, carrying a
 * `next` back to where they were so the click resumes after signing in.
 */
export function FundActions({
  code,
  slug,
  isAuthed,
  isWatched,
}: {
  code: string;
  slug: string;
  isAuthed: boolean;
  isWatched: boolean;
}) {
  const { track } = useEvents();

  const comparePath = `/karsilastir?fonlar=${code}`;
  const compareHref = isAuthed
    ? comparePath
    : `/giris?next=${encodeURIComponent(comparePath)}`;

  return (
    <>
      <Link
        href={compareHref}
        className={buttonClass({ variant: "secondary" })}
        onClick={() => track("fund_compare_click", { code, authed: isAuthed })}
      >
        Karşılaştır
      </Link>

      {isAuthed ? (
        <form
          action={toggleWatch.bind(null, code)}
          className={styles.watchForm}
          onSubmit={() =>
            track("fund_watch_toggled", {
              code,
              action: isWatched ? "remove" : "add",
              authed: true,
            })
          }
        >
          <WatchButton isWatched={isWatched} />
        </form>
      ) : (
        <Link
          href={`/giris?next=${encodeURIComponent(`/fon/${slug}`)}`}
          className={buttonClass()}
          onClick={() =>
            track("auth_cta_click", { target: "login", location: "fund_watch" })
          }
        >
          ☆ Takip Listeme Ekle
        </Link>
      )}
    </>
  );
}

function WatchButton({ isWatched }: { isWatched: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={isWatched ? "secondary" : "action"}
      disabled={pending}
    >
      {isWatched ? "✓ Takip Ediliyor" : "☆ Takip Listeme Ekle"}
    </Button>
  );
}
