// Bir nechta kadrni PNG qilib chiqaradi (bundle bir marta yig'iladi).
// Ishlatish: node scripts/stills.mjs 27.1 83.7 139.7   (soniyada)
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import { mkdirSync } from "node:fs";

const times = process.argv.slice(2).map(Number);
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null;
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "LyricVideo", browserExecutable });
mkdirSync("out/stills", { recursive: true });
for (const s of times) {
  const frame = Math.round(s * composition.fps);
  const output = `out/stills/t${s.toFixed(2)}.png`;
  await renderStill({ composition, serveUrl, frame, output, browserExecutable });
  console.log(output);
}
