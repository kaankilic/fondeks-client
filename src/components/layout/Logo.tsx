/**
 * The Fondeks mark: a dark tile with the brand trend line. Colors come from
 * the tokens so the mark stays in step with the rest of the chrome.
 */
export function Logo({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 88 88"
      aria-hidden
      focusable="false"
    >
      <rect width="88" height="88" rx="22" fill="var(--brand-ink)" />
      <polyline
        points="21.12,66.88 35.2,49.28 51.04,58.08 66.88,21.12"
        fill="none"
        stroke="var(--brand)"
        strokeWidth="7.04"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="66.88" cy="21.12" r="4.84" fill="var(--brand)" />
    </svg>
  );
}
