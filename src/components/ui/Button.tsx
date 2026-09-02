import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.scss";

type Variant = "action" | "brand" | "secondary" | "ghost";

type StyleOptions = {
  variant?: Variant;
  size?: "md" | "lg";
  block?: boolean;
  className?: string;
};

/** Shared class list, so links can wear the same skin as buttons. */
export function buttonClass({
  variant = "action",
  size = "md",
  block = false,
  className,
}: StyleOptions = {}) {
  return [
    styles.button,
    styles[variant],
    size === "lg" && styles.lg,
    block && styles.block,
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & StyleOptions;

export function Button({
  variant,
  size,
  block,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClass({ variant, size, block, className })}
      {...props}
    />
  );
}
