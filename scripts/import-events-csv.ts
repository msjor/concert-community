/**
 * Stub importer for venue CSV dumps → Supabase `events` rows.
 *
 * Expected CSV columns (header row):
 *   title,band_name,venue,city,date,genre,price_range,ticket_url,doors_at
 *
 * Usage (Node, with service-role key — never in the browser):
 *   npx tsx scripts/import-events-csv.ts ./data/shows.csv
 *
 * This file is intentionally a stub: wire SUPABASE_SERVICE_ROLE_KEY +
 * createClient when you have a real CSV feed. Prefer SQL seeds (005/006)
 * for local demos.
 */

import { readFileSync } from "node:fs";

type CsvRow = Record<string, string>;

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const row: CsvRow = {};
    headers.forEach((h, i) => {
      row[h] = (cols[i] ?? "").trim();
    });
    return row;
  });
}

function toEventInsert(row: CsvRow) {
  return {
    title: row.title,
    band_name: row.band_name,
    venue: row.venue,
    city: row.city,
    date: row.date,
    genre: row.genre,
    price_range: row.price_range || null,
    ticket_url: row.ticket_url || null,
    doors_at: row.doors_at || null,
  };
}

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: npx tsx scripts/import-events-csv.ts <file.csv>");
    process.exit(1);
  }

  const rows = parseCsv(readFileSync(path, "utf8"));
  const events = rows.map(toEventInsert).filter((e) => e.band_name && e.date);

  console.log(`Parsed ${events.length} events from ${path}`);
  console.log(
    "Stub only — set SUPABASE_SERVICE_ROLE_KEY and upsert into public.events.",
  );
  console.log(JSON.stringify(events.slice(0, 3), null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
