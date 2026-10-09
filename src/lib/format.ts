/** Shared date formatting — always use a fixed locale so SSR matches the first client paint. */

const LOCALE = "en-GB";

const dateTimeOptions: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

const longDateTimeOptions: Intl.DateTimeFormatOptions = {
  weekday: "long",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

const timeOptions: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

const dateOptions: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
};

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat(LOCALE, dateTimeOptions).format(new Date(iso));
}

export function formatLongDateTime(iso: string) {
  return new Intl.DateTimeFormat(LOCALE, longDateTimeOptions).format(new Date(iso));
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat(LOCALE, timeOptions).format(new Date(iso));
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat(LOCALE, dateOptions).format(new Date(iso));
}
