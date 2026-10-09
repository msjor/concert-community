/**
 * Refresh band artwork via iTunes Search API (no API key).
 *   node scripts/fetch-band-images.mjs
 */
import { writeFileSync } from "node:fs";

const bands = [
  "Deep Purple",
  "The Devil Wears Prada",
  "Hämatom",
  "Simple Plan",
  "Behemoth",
  "Uriah Heep",
  "Beast In Black",
  "Gloryhammer",
  "Shinedown",
  "Amon Amarth",
  "Nazareth",
  "Korn",
  "The Pretty Reckless",
  "Currents",
  "Eluveitie",
  "Papa Roach",
  "Polyphia",
  "Chelsea Wolfe",
  "Dayseeker",
  "Mean Messiah",
  "Syridas",
  "The Risen Dread",
  "Dimmu Borgir",
];

async function fetchArt(band) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(band)}&entity=song&limit=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const art = data.results?.[0]?.artworkUrl100;
  return art ? art.replace("100x100bb", "600x600bb") : null;
}

const out = {};
for (const b of bands) {
  out[b] = await fetchArt(b);
  console.log(b, out[b] ? "OK" : "MISS");
  await new Promise((r) => setTimeout(r, 150));
}
writeFileSync("band-images-cache.json", JSON.stringify(out, null, 2));
console.log("Wrote band-images-cache.json");
