import React, { useMemo } from "react";
import { fitTextOnNLines } from "@remotion/layout-utils";
import { interpolateColors, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, layout, moments, timing, voices } from "../config";
import { activeLineIndex, lyrics, type LyricLine } from "../lib/timeline";

const L = layout.lyrics;
const LINE_HEIGHT = 1.14;

type Prepared = LyricLine & { size: number; rows: string[]; rowWordStart: number[] };

const prepare = (): Prepared[] =>
  lyrics.map((line) => {
    const fit = (maxLines: number) =>
      fitTextOnNLines({
        text: line.line,
        maxLines,
        maxBoxWidth: L.width * 0.94,
        fontFamily: fonts.lyrics,
        fontWeight: 600,
        maxFontSize: L.activeMaxSize,
      });
    // Bir qatorga yetarlicha katta sig'sa — bir qator, aks holda 2 qatorga bo'linadi
    const single = fit(1);
    const { fontSize, lines } = single.fontSize >= L.singleLineMinSize ? single : fit(L.activeMaxLines);
    const rowWordStart: number[] = [];
    let n = 0;
    for (const row of lines) {
      rowWordStart.push(n);
      n += row.split(" ").filter(Boolean).length;
    }
    return { ...line, size: Math.floor(fontSize), rows: lines, rowWordStart };
  });

const SPRING = { damping: 200, stiffness: 190, mass: 0.8 };

/** 0..1: qator qanchalik "faol" (spring bilan kirish va chiqish) */
const activeness = (i: number, frame: number, fps: number) => {
  const startF = Math.round((lyrics[i].start - timing.lineLead) * fps);
  const nextF = i + 1 < lyrics.length ? Math.round((lyrics[i + 1].start - timing.lineLead) * fps) : Infinity;
  const inn = spring({ frame: frame - startF, fps, config: SPRING });
  const out = nextF === Infinity ? 0 : spring({ frame: frame - nextF, fps, config: SPRING });
  return Math.max(0, inn - out);
};

export const LyricsPanel: React.FC<{ opacity: number }> = ({ opacity }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const prepared = useMemo(prepare, []);
  const k = activeLineIndex(t);

  if (opacity < 0.005) return null;

  const from = Math.max(0, k - 4);
  const to = Math.min(prepared.length - 1, Math.max(k, 0) + 4);

  const blocks: { i: number; a: number; scale: number; h: number; top: number }[] = [];
  let y = 0;
  for (let i = from; i <= to; i++) {
    const p = prepared[i];
    const a = activeness(i, frame, fps);
    const scale = (L.inactiveSize + (p.size - L.inactiveSize) * a) / p.size;
    const h = p.rows.length * p.size * LINE_HEIGHT * scale;
    blocks.push({ i, a, scale, h, top: y });
    y += h + L.gap + a * 14;
  }

  // Scroll: faollik bilan tortilgan markaz (faol qator ekran markazida)
  let wSum = 0;
  let cSum = 0;
  let posSum = 0;
  for (const b of blocks) {
    wSum += b.a;
    cSum += b.a * (b.top + b.h / 2);
    posSum += b.a * b.i;
  }
  const first = blocks.find((b) => b.i === Math.max(0, k)) ?? blocks[0];
  const center = wSum > 0.001 ? cSum / wSum : first.top + first.h / 2;
  const scrollPos = wSum > 0.001 ? posSum / wSum : Math.max(0, k);
  const offset = 540 - center;
  const transition = Math.max(...blocks.map((b) => 4 * b.a * (1 - b.a)), 0);

  return (
    <div
      style={{
        position: "absolute",
        left: L.x,
        top: 0,
        width: L.width,
        height: 1080,
        opacity,
        fontFamily: fonts.lyrics,
        WebkitMaskImage: "linear-gradient(180deg, transparent 0%, #000 18%, #000 82%, transparent 100%)",
        maskImage: "linear-gradient(180deg, transparent 0%, #000 18%, #000 82%, transparent 100%)",
      }}
    >
      {blocks.map((b) => {
        const p = prepared[b.i];
        const d = b.i - scrollPos;
        const dimOpacity = d < 0 ? (d > -3.5 ? 0.28 : 0) : d < 1.5 ? 0.32 : d < 2.5 ? 0.15 : 0;
        const blockOpacity = dimOpacity + (1 - dimOpacity) * b.a;
        const blur = b.a > 0.98 ? 0 : transition * 2.2 * (1 - b.a) + (1 - b.a) * 0.6;
        return (
          <div
            key={p.index + "-" + p.start}
            style={{
              position: "absolute",
              left: 0,
              top: offset + b.top,
              width: L.width,
              height: b.h,
              opacity: blockOpacity,
              filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined,
            }}
          >
            <div style={{ transform: `scale(${b.scale})`, transformOrigin: "0 0", width: L.width / b.scale }}>
              <LineText line={p} active={b.a} t={t} frame={frame} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

const LineText: React.FC<{ line: Prepared; active: number; t: number; frame: number }> = ({
  line,
  active,
  t,
  frame,
}) => {
  const v = voices[line.singer];
  const attack = timing.wordAttack[line.singer];
  const sungColor = interpolateColors(active, [0, 1], [colors.ink, v.text]);
  const unsungColor = interpolateColors(active, [0, 1], [colors.ink, colors.inkDim]);
  const choke = moments.chokeLines.includes(line.index) && active > 0.3;
  const glowRgb = v.glow.match(/\d+,\d+,\d+/)?.[0] ?? "232,185,138";

  return (
    <div style={{ fontSize: line.size, fontWeight: 600, lineHeight: LINE_HEIGHT, letterSpacing: "-.005em", whiteSpace: "nowrap" }}>
      {line.rows.map((row, r) => (
        <div key={r}>
          {row
            .split(" ")
            .filter(Boolean)
            .map((w, j) => {
              const wi = line.rowWordStart[r] + j;
              const word = line.words[wi];
              const since = word ? t + timing.wordLead - word.start : -1;
              const p = Math.min(1, Math.max(0, since / attack));
              const e = easeOut(p);
              const frost = moments.wordEffects.some(
                (fx) => fx.line === line.index && fx.effect === "frost" && w.toLowerCase().startsWith(fx.word),
              );

              // Yonish paytidagi "bloom": so'z boshlanishida kuchli, keyin yumshoq doimiy glow
              const bloom = since > 0 ? Math.exp(-since / 0.35) : 0;
              const glowA = active * (0.28 + 0.5 * bloom) * e;
              const color = p > 0 ? interpolateColors(e, [0, 1], [unsungColor, frost && active > 0.5 ? colors.frost : sungColor]) : unsungColor;
              const glow =
                p > 0 && active > 0.05
                  ? `0 0 ${24 + 36 * bloom}px rgba(${frost ? "190,225,255" : glowRgb},${glowA.toFixed(3)})${
                      frost ? `, 0 0 6px rgba(220,240,255,${(0.6 * e * active).toFixed(3)})` : ""
                    }`
                  : undefined;

              // Pop: pastdan chiqib, bir oz kattalashib, joyiga tushadi
              const pop = active > 0.4 ? Math.sin(Math.min(1, p) * Math.PI) * 0.07 * active : 0;
              const lift = active > 0.4 ? (1 - e) * 10 * active : 0;
              const wBlur = active > 0.4 && p > 0 && p < 1 ? (1 - e) * 3 : 0;

              // Bo'g'ilish: nafas yetmaydi — mayda titrash
              let jx = 0;
              let jy = 0;
              if (choke) {
                const q = Math.floor(frame / 2);
                jx = (random(`jx${wi}-${q}`) - 0.5) * 3.2 * active;
                jy = (random(`jy${wi}-${q}`) - 0.5) * 2.4 * active;
              }

              return (
                <React.Fragment key={j}>
                  {j > 0 ? " " : ""}
                  <span
                    style={{
                      display: "inline-block",
                      color,
                      textShadow: glow,
                      transform: `translate(${jx.toFixed(2)}px, ${(lift + jy).toFixed(2)}px) scale(${(1 + pop).toFixed(4)})`,
                      transformOrigin: "50% 70%",
                      filter: wBlur > 0.05 ? `blur(${wBlur.toFixed(2)}px)` : undefined,
                      letterSpacing: frost && p > 0 ? `${(0.02 * e * active).toFixed(3)}em` : undefined,
                    }}
                  >
                    {w}
                  </span>
                </React.Fragment>
              );
            })}
        </div>
      ))}
    </div>
  );
};
