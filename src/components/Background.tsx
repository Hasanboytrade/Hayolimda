import React from "react";
import { AbsoluteFill, Img, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, FPS, track } from "../config";
import type { Mood } from "../lib/timeline";

const BUTTERFLY =
  "M0 0C-30-55-95-60-90-15-88 15-40 18 0 0C-30 25-70 70-42 62-20 56-6 28 0 0ZM0 0C30-55 95-60 90-15 88 15 40 18 0 0C30 25 70 70 42 62 20 56 6 28 0 0Z";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rgba = (rgb: string, a: number) => `rgba(${rgb},${a.toFixed(3)})`;
const mixRgb = (a: string, b: string, t: number) => {
  const pa = a.split(",").map(Number);
  const pb = b.split(",").map(Number);
  return pa.map((v, i) => Math.round(lerp(v, pb[i], t))).join(",");
};

type Props = { mood: Mood; pulse: number };

export const Background: React.FC<Props> = ({ mood, pulse }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const t = frame / FPS;
  const progress = frame / durationInFrames;
  const glowRgb = mixRgb(colors.bokeh, colors.bokehCold, mood.cool);

  // Juda sekin "kamera" harakati
  const drift = 1.04 + progress * 0.06;
  const dx = Math.sin(t * 0.05) * 30;
  const dy = Math.cos(t * 0.04) * 20;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, overflow: "hidden" }}>
      {/* 1. Blur qilingan, kattalashtirilgan cover */}
      <Img
        src={staticFile(track.coverBlur)}
        style={{
          position: "absolute",
          left: -200,
          top: -560,
          width: 2320,
          height: 2320,
          objectFit: "cover",
          opacity: lerp(0.62, 0.95, mood.brightness) + pulse * 0.05,
          transform: `translate(${dx}px, ${dy}px) scale(${drift})`,
        }}
      />

      {/* 2. Sovuq tus (Hasanboy) */}
      <AbsoluteFill style={{ background: "rgb(28,38,52)", mixBlendMode: "color", opacity: mood.cool * 0.55 }} />

      {/* 3. Qorong'i gradient overlay (dizayndan) + kayfiyatga qarab qo'shimcha qorong'ilik */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(100deg,rgba(8,5,4,.72) 0%,rgba(8,5,4,.58) 45%,rgba(6,4,3,.84) 100%)",
        }}
      />
      <AbsoluteFill style={{ background: "rgb(4,4,5)", opacity: (1 - mood.brightness) * 0.42 }} />
      <AbsoluteFill
        style={{ background: "radial-gradient(ellipse at 62% 45%,rgba(0,0,0,0) 0%,rgba(3,2,2,.72) 100%)" }}
      />

      {/* 4. Yorug'lik manbai (cover'dagi fonar kabi) + bass pulse */}
      <div
        style={{
          position: "absolute",
          left: "46%",
          top: "-6%",
          width: 1000,
          height: 1000,
          background: `radial-gradient(circle, ${rgba(glowRgb, 0.1 + mood.brightness * 0.08 + pulse * 0.07)}, ${rgba(glowRgb, 0)} 65%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: -80,
          height: 460,
          background: `radial-gradient(ellipse at 50% 100%, ${rgba("190,150,110", 0.08 + mood.brightness * 0.06 + pulse * 0.04)}, rgba(0,0,0,0) 70%)`,
        }}
      />

      <Fog t={t} amount={0.5 + mood.haze * 0.5} rgb={mixRgb("200,170,140", "150,160,175", mood.cool)} />
      <Bokeh t={t} rgb={glowRgb} intensity={0.6 + mood.brightness * 0.4 + pulse * 0.3} />
      <Butterflies t={t} cool={mood.cool} />
      <Rain t={t} amount={mood.rain} width={width} height={height} />
      <Dust t={t} density={mood.dust} cool={mood.cool} width={width} height={height} />

      {/* 5. Chang pardasi: "havo yetishmaydi" */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(120,92,64,0) 0%, rgba(120,92,64,.35) 55%, rgba(150,118,84,.55) 100%)",
          opacity: mood.haze * 0.55,
        }}
      />

      {/* 6. Bass urishida umumiy yengil yorug'lik */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 55%, ${rgba(glowRgb, 0.09)}, rgba(0,0,0,0) 75%)`,
          opacity: pulse,
        }}
      />
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- Tuman */
const Fog: React.FC<{ t: number; amount: number; rgb: string }> = ({ t, amount, rgb }) => {
  const layers = [
    { y: 640, h: 520, w: 2200, speed: 6, phase: 0, a: 0.1 },
    { y: 380, h: 420, w: 1800, speed: -4, phase: 700, a: 0.07 },
    { y: 820, h: 380, w: 2400, speed: 3, phase: 1300, a: 0.09 },
  ];
  return (
    <>
      {layers.map((l, i) => {
        const x = ((l.phase + t * l.speed * 10) % 3200) - 1600;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: l.y - l.h / 2,
              width: l.w,
              height: l.h,
              background: `radial-gradient(ellipse at 50% 50%, ${rgba(rgb, l.a * amount)}, ${rgba(rgb, 0)} 70%)`,
            }}
          />
        );
      })}
    </>
  );
};

/* ---------------------------------------------------------------- Bokeh chiroqlar */
const BOKEH = Array.from({ length: 12 }, (_, i) => ({
  x: 860 + random(`bx${i}`) * 1060,
  y: 60 + random(`by${i}`) * 960,
  r: 40 + random(`br${i}`) * 110,
  a: 0.07 + random(`ba${i}`) * 0.09,
  sp: 0.15 + random(`bs${i}`) * 0.35,
  ph: random(`bp${i}`) * Math.PI * 2,
}));

const Bokeh: React.FC<{ t: number; rgb: string; intensity: number }> = ({ t, rgb, intensity }) => (
  <>
    {BOKEH.map((b, i) => {
      const x = b.x + Math.sin(t * b.sp * 0.3 + b.ph) * 40;
      const y = b.y + Math.cos(t * b.sp * 0.25 + b.ph) * 30;
      const tw = 0.7 + 0.3 * Math.sin(t * b.sp + b.ph);
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            left: x - b.r,
            top: y - b.r,
            width: b.r * 2,
            height: b.r * 2,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${rgba(rgb, b.a * tw * intensity)} 0%, ${rgba(rgb, b.a * tw * intensity * 0.6)} 45%, ${rgba(rgb, 0)} 70%)`,
          }}
        />
      );
    })}
  </>
);

/* ---------------------------------------------------------------- Kapalaklar */
const BUTTERFLIES = [
  { x: 1520, y: 180, s: 1.5, rot: -18, sp: 0.018, ph: 0 },
  { x: 1010, y: 820, s: 1.05, rot: 14, sp: 0.024, ph: 2 },
  { x: 1790, y: 640, s: 0.8, rot: 28, sp: 0.03, ph: 4 },
  { x: 380, y: 940, s: 0.7, rot: -8, sp: 0.022, ph: 1 },
];

const Butterflies: React.FC<{ t: number; cool: number }> = ({ t, cool }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
    <g fill={cool > 0.5 ? "#8fa3b5" : colors.butterfly} opacity={0.07 - cool * 0.015}>
      {BUTTERFLIES.map((b, i) => {
        const x = b.x + Math.sin(t * b.sp * 6 + b.ph) * 120 + t * 2;
        const y = b.y + Math.cos(t * b.sp * 5 + b.ph) * 60 - Math.sin(t * 0.1 + b.ph) * 20;
        const flap = 0.55 + 0.45 * Math.abs(Math.sin(t * 1.4 + b.ph));
        const wrapX = ((x % 2200) + 2200) % 2200 - 140;
        return (
          <g key={i} transform={`translate(${wrapX},${y}) rotate(${b.rot + Math.sin(t * 0.3 + b.ph) * 8}) scale(${b.s * flap},${b.s})`}>
            <path d={BUTTERFLY} />
          </g>
        );
      })}
    </g>
  </svg>
);

/* ---------------------------------------------------------------- Chang zarrachalari */
const DUST = Array.from({ length: 160 }, (_, i) => ({
  x: random(`dx${i}`),
  y: random(`dy${i}`),
  r: 0.8 + random(`dr${i}`) * 2.2,
  a: 0.2 + random(`da${i}`) * 0.4,
  vx: 4 + random(`dvx${i}`) * 14,
  vy: -3 - random(`dvy${i}`) * 9,
  ph: random(`dp${i}`) * Math.PI * 2,
  gate: random(`dg${i}`), // zichlik: gate < density bo'lsa ko'rinadi
}));

const Dust: React.FC<{ t: number; density: number; cool: number; width: number; height: number }> = ({
  t,
  density,
  cool,
  width,
  height,
}) => (
  <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
    {DUST.map((d, i) => {
      const vis = Math.min(1, Math.max(0, (density - d.gate) * 6));
      if (vis <= 0) return null;
      const x = (((d.x * width + t * d.vx * (1 + density)) % width) + width) % width;
      const y = (((d.y * height + t * d.vy + Math.sin(t * 0.7 + d.ph) * 8) % height) + height) % height;
      const tw = 0.6 + 0.4 * Math.sin(t * 1.3 + d.ph);
      return (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={d.r * (1 + density * 0.4)}
          fill={cool > 0.6 ? colors.dustCold : colors.dust}
          opacity={d.a * tw * vis}
        />
      );
    })}
  </svg>
);

/* ---------------------------------------------------------------- Yomg'ir (tungi ko'cha) */
const RAIN = Array.from({ length: 70 }, (_, i) => ({
  x: random(`rx${i}`),
  y: random(`ry${i}`),
  len: 30 + random(`rl${i}`) * 50,
  v: 700 + random(`rv${i}`) * 500,
  a: 0.05 + random(`ra${i}`) * 0.08,
  gate: random(`rg${i}`),
}));

const Rain: React.FC<{ t: number; amount: number; width: number; height: number }> = ({ t, amount, width, height }) => {
  if (amount < 0.02) return null;
  return (
    <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
      <g stroke="#c9d2da" strokeWidth={1.2} strokeLinecap="round">
        {RAIN.map((r, i) => {
          const vis = Math.min(1, Math.max(0, (amount - r.gate) * 4));
          if (vis <= 0) return null;
          const y = ((r.y * (height + 200) + t * r.v) % (height + 200)) - 100;
          const x = (r.x * (width + 200) - y * 0.12) % (width + 200);
          return <line key={i} x1={x} y1={y} x2={x - r.len * 0.12} y2={y + r.len} opacity={r.a * vis} />;
        })}
      </g>
    </svg>
  );
};
