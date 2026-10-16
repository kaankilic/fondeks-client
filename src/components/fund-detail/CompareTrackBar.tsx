"use client";

import { useFormStatus } from "react-dom";

import { useEvents } from "@/lib/analytics/useEvents";
import { toggleWatch } from "@/lib/watchlist/actions";

import styles from "./CompareTrackBar.module.scss";

/**
 * The compare board's coupling to Hold: once two funds sit side by side, the
 * next step is to track the one you chose. This turns the comparison into a
 * decision by putting an "add to tracking" control under the board, and emits
 * the compare-to-track north-star event when it is used — the clearest version
 * of that signal, since the add happens on the compare surface itself.
 */
export function CompareTrackBar({
  funds,
  watched,
}: {
  funds: { code: string; name: string }[];
  watched: string[];
}) {
  if (funds.length < 2) return null;

  const watchedSet = new Set(watched);

  return (
    <section className={styles.bar} aria-label="Karşılaştırdığın fonu takibe al">
      <div className={styles.lead}>
        <span className={styles.title}>Kararını ver, takibe al</span>
        <span className={styles.sub}>
          Beğendiğin fonu izleme listene ekle; getirisini ve maliyetini
          buradan takip et.
        </span>
      </div>

      <div className={styles.actions}>
        {funds.map((fund) => (
          <TrackButton
            key={fund.code}
            code={fund.code}
            isWatched={watchedSet.has(fund.code)}
          />
        ))}
      </div>
    </section>
  );
}

function TrackButton({ code, isWatched }: { code: string; isWatched: boolean }) {
  const { track } = useEvents();

  return (
    <form
      action={toggleWatch.bind(null, code)}
      onSubmit={() => {
        const action = isWatched ? "remove" : "add";
        track("fund_watch_toggled", { code, action, authed: true });
        if (action === "add") {
          // The add happens on the compare board, so the comparison is a
          // certainty — `compared` is true by construction.
          track("compare_to_track", { code, from: "compare", compared: true });
        }
      }}
    >
      <SubmitButton code={code} isWatched={isWatched} />
    </form>
  );
}

function SubmitButton({ code, isWatched }: { code: string; isWatched: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={`${styles.btn} ${isWatched ? styles.on : ""}`}
      disabled={pending}
    >
      <span className={styles.btnCode}>{code}</span>
      <span className={styles.btnLabel}>
        {isWatched ? "✓ Takipte" : "☆ Takibe al"}
      </span>
    </button>
  );
}
