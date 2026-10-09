"use client";

import { useEffect, useState } from "react";
import {
  formatDate,
  formatDateTime,
  formatLongDateTime,
  formatTime,
} from "@/lib/format";

type Variant = "datetime" | "long" | "time" | "date";

type Props = {
  iso: string;
  variant?: Variant;
  className?: string;
};

const formatters: Record<Variant, (iso: string) => string> = {
  datetime: formatDateTime,
  long: formatLongDateTime,
  time: formatTime,
  date: formatDate,
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Pure UTC string with no Intl — identical in Node and every browser.
 * Used only for the SSR / pre-hydration paint.
 */
function deterministicUtc(iso: string, variant: Variant): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const mo = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const h = pad(d.getUTCHours());
  const mi = pad(d.getUTCMinutes());

  if (variant === "time") return `${h}:${mi} UTC`;
  if (variant === "date") return `${y}-${mo}-${day}`;
  return `${y}-${mo}-${day} ${h}:${mi} UTC`;
}

/**
 * Industry-standard hydration-safe date:
 * 1. Server + first client paint render the same deterministic UTC string.
 * 2. After mount, replace with the viewer's local Intl formatting.
 *
 * Never call locale-aware Intl during SSR for visible text.
 * @see https://react.dev/reference/react-dom/client/hydrateRoot#suppressing-unavoidable-hydration-mismatch-errors
 */
export function FormattedTime({ iso, variant = "datetime", className }: Props) {
  const [text, setText] = useState(() => deterministicUtc(iso, variant));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setText(formatters[variant](iso));
    setReady(true);
  }, [iso, variant]);

  return (
    <time
      dateTime={iso}
      className={className}
      // Local timezone text is intentionally different after mount.
      suppressHydrationWarning
      data-hydrated={ready ? "true" : "false"}
    >
      {text}
    </time>
  );
}
