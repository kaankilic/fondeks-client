"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import styles from "./SearchInput.module.scss";

type SearchInputProps = {
  placeholder?: string;
  compact?: boolean;
} & (
  | {
      /** Controlled: the parent owns the query and filters as you type. */
      value: string;
      onChange: (value: string) => void;
    }
  | {
      /** Uncontrolled: submitting navigates to the results screen. */
      value?: undefined;
      onChange?: undefined;
      defaultValue?: string;
    }
);

/** Search box from the screener top bar and the filter rail. */
export function SearchInput(props: SearchInputProps) {
  const {
    placeholder = "Fon adı, kod veya kurucu ara…",
    compact = false,
  } = props;
  const router = useRouter();
  const [internal, setInternal] = useState(
    props.value === undefined ? (props.defaultValue ?? "") : "",
  );

  const controlled = props.value !== undefined;
  const query = controlled ? props.value : internal;

  function update(next: string) {
    if (controlled) props.onChange(next);
    else setInternal(next);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (controlled) return;

    const trimmed = query.trim();
    router.push(trimmed ? `/arama?q=${encodeURIComponent(trimmed)}` : "/arama");
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className={`${styles.form} ${compact ? styles.compact : ""}`}
    >
      <svg
        className={styles.icon}
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden
      >
        <circle cx="6" cy="6" r="4.6" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M9.6 9.6L12.5 12.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <input
        className={styles.input}
        value={query}
        onChange={(event) => update(event.target.value)}
        placeholder={placeholder}
        aria-label="Fon ara"
      />
    </form>
  );
}
