import React, { useMemo } from "react";
import { fitTextOnNLines } from "@remotion/layout-utils";
import { interpolateColors, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, layout, timing, voices } from "../config";
import { activeLineIndex, lyrics, type LyricLine } from "../lib/timeline";

const L = layout.lyrics;
const LINE_HEIGHT = 1.12;
const LABEL_SLOT = L.labelHeight + L.labelGap;

type Prepared = LyricLine & { size: number; rows: string[]; rowWordStart: number[] };

const prepare = (): Prepared[] =>
  lyrics.map((line) => {
    const fit = (maxLines: number) =>
      fitTextOnNLines({
        text: line.line,
        maxLines,
        maxBoxWidth: L.width * 0.96,
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

/** 0..1: qator qanchalik "faol" (spring bilan kirish va chiqish) */
const activeness = (i: number, frame: number, fps: number) => {
  const startF = Math.round((lyrics[i].start - timing.lineLead) * fps);
  const nextF = i + 1 < lyrics.length ? Math.round((lyrics[i + 1].start - timing.lineLead) * fps) : Infinity;
  const cfg = { damping: 200, stiffness: 120, mass: 0.9 };
  const inn = spring({ frame: frame - startF, fps, config: cfg });
  const out = nextF === Infinity ? 0 : spring({ frame: frame - nextF, fps, config: cfg });
  return Math.max(0, inn - out);
};

export const LyricsPanel: React.FC<{ opacity: number }> = ({ opacity }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const prepared = useMemo(prepare, []);
  const k = activeLineIndex(t);

  // Faqat atrofdagi qatorlar bilan ishlaymiz
  const from = Math.max(0, k - 4);
  const to = Math.min(prepared.length - 1, Math.max(k, 0) + 4);

  const blocks: { i: number; a: number; scale: number; h: number; top: number }[] = [];
  let y = 0;
  for (let i = from; i <= to; i++) {
    const p = prepared[i];
    const a = activeness(i, frame, fps);
    const scale = (L.inactiveSize + (p.size - L.inactiveSize) * a) / p.size;
    const textH = p.rows.length * p.size * LINE_HEIGHT * scale;
    const h = LABEL_SLOT * a + textH;
    blocks.push({ i, a, scale, h, top: y });
    y += h + L.gap;
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

  // Ovoz yorlig'i: joriy qator ijrochisi
  const singer = k >= 0 ? lyrics[k].singer : lyrics[0].singer;

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
        WebkitMaskImage: "linear-gradient(180deg, transparent 0%, #000 16%, #000 84%, transparent 100%)",
        maskImage: "linear-gradient(180deg, transparent 0%, #000 16%, #000 84%, transparent 100%)",
      }}
    >
      {blocks.map((b) => {
        const p = prepared[b.i];
        const d = b.i - scrollPos;
        const dimOpacity = d < 0 ? (d > -3.5 ? 0.3 : 0) : d < 1.5 ? 0.3 : d < 2.5 ? 0.15 : 0;
        const blockOpacity = dimOpacity + (1 - dimOpacity) * b.a;
        const blur = b.a > 0.98 ? 0 : transition * 1.8 * (1 - b.a) + (1 - b.a) * 0.4;
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
            <SingerLabel active={b.a} singer={b.i === k ? singer : p.singer} />
            <div
              style={{
                transform: `scale(${b.scale})`,
                transformOrigin: "0 0",
                width: L.width / b.scale,
              }}
            >
              <LineText line={p} active={b.a} t={t} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const SingerLabel: React.FC<{ active: number; singer: LyricLine["singer"] }> = ({ active, singer }) => {
  const v = voices[singer];
  if (active < 0.01) return null;
  return (
    <div
      style={{
        height: LABEL_SLOT * active,
        overflow: "hidden",
        opacity: active,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          height: L.labelHeight,
          fontFamily: fonts.ui,
          fontSize: 24,
          fontWeight: 500,
          letterSpacing: ".3em",
          textTransform: "uppercase",
          color: v.color,
          transform: `translateY(${(1 - active) * 12}px)`,
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: v.color,
            boxShadow: `0 0 16px ${v.color}`,
          }}
        />
        {v.label}
      </div>
    </div>
  );
};

const LineText: React.FC<{ line: Prepared; active: number; t: number }> = ({ line, active, t }) => {
  const v = voices[line.singer];
  const sungColor = interpolateColors(active, [0, 1], [colors.ink, v.text]);
  const unsungColor = interpolateColors(active, [0, 1], [colors.ink, colors.inkDim]);
  const glow = `0 0 40px ${v.glow.replace(/[\d.]+\)$/, `${(0.45 * active).toFixed(3)})`)}`;

  return (
    <div
      style={{
        fontSize: line.size,
        fontWeight: active > 0.5 ? 600 : 500,
        lineHeight: LINE_HEIGHT,
        letterSpacing: "-.005em",
        whiteSpace: "nowrap",
      }}
    >
      {line.rows.map((row, r) => (
        <div key={r}>
          {row
            .split(" ")
            .filter(Boolean)
            .map((w, j) => {
              const word = line.words[line.rowWordStart[r] + j];
              const p = word ? Math.min(1, Math.max(0, (t - word.start) / Math.max(0.05, word.end - word.start))) : 0;
              const space = j > 0 ? " " : "";
              if (p >= 1) {
                return (
                  <span key={j} style={{ color: sungColor, textShadow: active > 0.05 ? glow : undefined }}>
                    {space}
                    {w}
                  </span>
                );
              }
              if (p <= 0) {
                return (
                  <span key={j} style={{ color: unsungColor }}>
                    {space}
                    {w}
                  </span>
                );
              }
              return (
                <span key={j}>
                  {space}
                  <span style={{ position: "relative", display: "inline-block" }}>
                    <span style={{ color: unsungColor }}>{w}</span>
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        color: sungColor,
                        textShadow: glow,
                        clipPath: `inset(-40px ${((1 - p) * 100).toFixed(1)}% -40px -40px)`,
                      }}
                    >
                      {w}
                    </span>
                  </span>
                </span>
              );
            })}
        </div>
      ))}
    </div>
  );
};
