import React from "react";
import { Easing, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, layout, moments, timing, track } from "../config";
import { bassPulse, spectrum } from "../lib/timeline";

const BARS = 32;
const RING = 72;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/**
 * O'ng panel, matnsiz joylar uchun: trek nomi + artistlar + equalizer.
 * Boshida: sarlavha fade-in; beat drop'dan oldin nur yig'iladi, drop'da harflar parchalanib uchib ketadi.
 */
export const Visualizer: React.FC<{ opacity: number }> = ({ opacity }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const L = layout.lyrics;
  const introEnd = timing.introSeconds;
  const drop = moments.introDrop;

  if (opacity < 0.005) return null;

  const titleIn = interpolate(t, [0.3, 1.6], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const artistIn = interpolate(t, [1.0, 2.2], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const settle = interpolate(t, [introEnd, introEnd + 1.2], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  // Drop oldidan 2.5 s: energiya yig'iladi
  const build = interpolate(t, [drop - 2.5, drop], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  // Drop: parchalanish (faqat intro uchun)
  const explode = t < drop + 3 ? interpolate(t, [drop, drop + 0.9], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) }) : 1;
  const introPart = t < drop + 3;

  const pulse = bassPulse(frame);
  const cur = spectrum(frame);
  const prev = spectrum(frame - 1);
  const prev2 = spectrum(frame - 2);
  const bands = cur.map((v, i) => v * 0.5 + (prev[i] ?? v) * 0.3 + (prev2[i] ?? v) * 0.2);
  const mirrored = [...bands.slice().reverse(), ...bands];

  const titleSize = 176 - 56 * settle;
  const letters = track.title.split("");
  const ringOn = introPart ? settle * (1 - explode) : 1;
  const rot = t * 6;

  return (
    <div
      style={{
        position: "absolute",
        left: L.x,
        top: 0,
        width: L.width,
        height: 1080,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        opacity,
      }}
    >
      {/* Radial equalizer halqasi */}
      <svg
        width={860}
        height={860}
        viewBox="-430 -430 860 860"
        style={{ position: "absolute", left: 0, top: 540 - 430 - 60, opacity: ringOn * 0.55 }}
      >
        <g transform={`rotate(${rot})`}>
          {Array.from({ length: RING }, (_, i) => {
            const v = bands[i % bands.length] ?? 0;
            const ang = (i / RING) * Math.PI * 2;
            const r0 = 250 + pulse * 10;
            const r1 = r0 + 8 + Math.pow(v, 1.5) * 70;
            return (
              <line
                key={i}
                x1={Math.cos(ang) * r0}
                y1={Math.sin(ang) * r0}
                x2={Math.cos(ang) * r1}
                y2={Math.sin(ang) * r1}
                stroke={colors.accent}
                strokeWidth={3}
                strokeLinecap="round"
                opacity={0.35 + v * 0.6}
              />
            );
          })}
        </g>
        <circle r={236 + pulse * 10} fill="none" stroke="rgba(233,220,203,.18)" strokeWidth={1} />
      </svg>

      <div
        style={{
          width: 1,
          height: (90 + build * 60) * (1 - settle * (1 - build)),
          marginBottom: 44 * (1 - settle),
          background: `linear-gradient(${colors.accent}00, ${colors.accent})`,
          opacity: titleIn * (1 - explode),
          boxShadow: build > 0 ? `0 0 ${20 * build}px rgba(255,220,180,${build})` : undefined,
        }}
      />

      {/* Sarlavha: harflar alohida — drop'da har biri o'z yo'nalishida uchib ketadi */}
      <div
        style={{
          fontFamily: fonts.title,
          fontWeight: 500,
          fontSize: titleSize,
          lineHeight: 1,
          letterSpacing: `${0.06 + build * 0.06}em`,
          color: colors.ink,
          opacity: titleIn,
          transform: `translateY(${(1 - titleIn) * 24}px) scale(${1 + build * 0.05})`,
          whiteSpace: "nowrap",
        }}
      >
        {letters.map((ch, i) => {
          const ang = (random(`ea${i}`) - 0.5) * Math.PI * 1.4 + (i < letters.length / 2 ? Math.PI : 0);
          const dist = 260 + random(`ed${i}`) * 520;
          const e = introPart ? explode : 0;
          const delay = Math.abs(i - letters.length / 2) * 0.02;
          const ee = Math.max(0, Math.min(1, (e - delay) / (1 - delay)));
          const x = Math.cos(ang) * dist * ee;
          const y = Math.sin(ang) * dist * ee * 0.6 - ee * 40;
          const r = (random(`er${i}`) - 0.5) * 90 * ee;
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${r.toFixed(1)}deg) scale(${(1 + ee * 0.6).toFixed(3)})`,
                opacity: 1 - ee,
                filter: ee > 0.01 ? `blur(${(ee * 18).toFixed(1)}px)` : undefined,
                textShadow: `0 6px 50px rgba(0,0,0,.6), 0 0 ${(build * 50 + pulse * 20).toFixed(0)}px rgba(255,220,180,${(build * 0.6 + pulse * 0.15).toFixed(3)})`,
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 44 - 16 * settle,
          fontFamily: fonts.ui,
          fontSize: 34 - 8 * settle,
          fontWeight: 300,
          letterSpacing: `${0.42 + (introPart ? explode : 0) * 0.8}em`,
          paddingLeft: ".42em",
          textTransform: "uppercase",
          color: colors.accent,
          opacity: artistIn * (1 - (introPart ? explode : 0)),
          transform: `translateY(${(1 - artistIn) * 16 + (introPart ? explode : 0) * 40}px)`,
          filter: introPart && explode > 0.01 ? `blur(${(explode * 10).toFixed(1)}px)` : undefined,
        }}
      >
        {track.artists}
      </div>

      {/* Equalizer */}
      <div
        style={{
          marginTop: 72 * settle,
          height: 150 * settle,
          display: "flex",
          alignItems: "center",
          gap: 10,
          opacity: settle * 0.85 * (1 - (introPart ? explode : 0)),
          transform: `scaleY(${1 + build * 0.4 - (introPart ? explode : 0)})`,
        }}
      >
        {mirrored.map((v, i) => {
          const edge = 1 - Math.abs(i - (BARS - 1) / 2) / (BARS / 2);
          const h = 6 + Math.pow(v, 1.6) * 140 * (0.45 + 0.55 * edge);
          return (
            <div
              key={i}
              style={{
                width: 8,
                height: h * settle,
                borderRadius: 4,
                background: `linear-gradient(180deg, ${colors.ink}, ${colors.accent})`,
                opacity: 0.35 + 0.55 * v,
                boxShadow: `0 0 ${10 + v * 14}px rgba(216,180,140,${0.15 + v * 0.25})`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
