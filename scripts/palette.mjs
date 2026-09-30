// Cover'dan dominant ranglarni ajratib oladi (node-vibrant) -> src/data/palette.json
// Ishga tushirish: npm run palette
import { Vibrant } from "node-vibrant/node";
import { writeFileSync, mkdirSync } from "node:fs";

const src = process.argv[2] ?? "public/cover.jpg";
const palette = await Vibrant.from(src).getPalette();

const out = {};
for (const [name, swatch] of Object.entries(palette)) {
  if (!swatch) continue;
  out[name] = { hex: swatch.hex, rgb: swatch.rgb.map(Math.round), population: swatch.population };
}
mkdirSync("src/data", { recursive: true });
writeFileSync("src/data/palette.json", JSON.stringify(out, null, 2) + "\n");
console.table(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, `${v.hex}  (pop ${v.population})`])));
