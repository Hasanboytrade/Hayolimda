import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, layout, moments, timing, voices } from "../config";
import { lyrics } from "../lib/timeline";

const line = lyrics.find((l) => l.index === moments.lastWordsLine);
const isAnchor = (w: string) => w.toLowerCase().replace(/[^a-z']/g, "").startsWith("so'nggi");
const clean = (w: string) => w.replace(/[,.!?]/g, "");

/** Sahna qanchalik ko'rinadi (0..1) — LyricVideo boshqa qatlamlarni shunga qarab yashiradi */
export const lastWordsAmount = (t: number): number => {
  if (!line) return 0;
  const next = lyrics.find((l) => l.start > line.start);
  const a = line.start - timing.lineLead - 0.25;
  const endAt = (next?.start ?? line.end + 0.6) - 0.05;
  const inn = interpolate(t, [a, a + 0.35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const out = interpolate(t, [endAt - 0.1, endAt + 0.15], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return Math.min(inn, out);
};

/**
 * "So'nggi trek, so'nggi nota, so'nggi so'z":
 * "SO'NGGI" joyida turadi va har aytilganda urg'u bilan pulsatsiya qiladi,
 * ostidagi so'z slot-mashina kabi almashadi: trek -> nota -> so'z.
 */
export const LastWords: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (!line) return null;
  const amount = lastWordsAmount(t);
  if (amount < 0.005) return null;

  const v = voices[line.singer];
  const words = line.words;
  const anchors = words.filter((w) => isAnchor(w.w));
  const slots = words.filter((w) => !isAnchor(w.w));
  const lead = timing.wordLead;
  const f = (sec: number) => Math.round((sec - lead) * fps);

  // Yuqoridagi "SO'NGGI": birinchi paydo bo'lishi + har bir takrorda pulse
  const appear = spring({ frame: frame - f(anchors[0]?.start ?? line.start), fps, config: { damping: 200, stiffness: 120 } });
  let pulse = 0;
  for (const a of anchors) {
    const since = t + lead - a.start;
    if (since >= 0) pulse = Math.max(pulse, Math.exp(-since / 0.28));
  }
  const count = anchors.filter((a) => t + lead >= a.start).length;

  // Oxirida so'zlar sochilib, xor iliq nurga aylanadi
  const endT = line.end;
  const dissolve = interpolate(t, [endT - 0.05, endT + 0.25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const L = layout.lyrics;
  const slotH = 230;

  return (
    <AbsoluteFill style={{ opacity: amount }}>
      {/* Diqqatni markazlash: atrof qorayadi */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at 72% 50%, rgba(0,0,0,0) 0%, rgba(2,3,5,.55) 45%, rgba(1,1,2,.86) 100%)",
        }}
      />
      {/* Spot yorug'lik */}
      <div
        style={{
          position: "absolute",
          left: L.x + L.width / 2 - 600,
          top: 540 - 520,
          width: 1200,
          height: 1040,
          background: `radial-gradient(ellipse at 50% 50%, rgba(169,188,205,${(0.1 + pulse * 0.1).toFixed(3)}) 0%, rgba(169,188,205,0) 60%)`,
        }}
      />
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
          fontFamily: fonts.lyrics,
        }}
      >
        <div
          style={{
            fontSize: 124,
            fontWeight: 700,
            letterSpacing: `${0.18 + dissolve * 0.5}em`,
            paddingLeft: `${0.18 + dissolve * 0.5}em`,
            textTransform: "uppercase",
            color: v.text,
            opacity: appear * (1 - dissolve),
            filter: `blur(${((1 - appear) * 16 + dissolve * 14).toFixed(2)}px)`,
            transform: `scale(${(1.18 - appear * 0.18 + pulse * 0.07).toFixed(4)})`,
            textShadow: `0 0 ${30 + pulse * 60}px rgba(143,163,181,${(0.35 + pulse * 0.5).toFixed(3)}), 0 0 2px rgba(220,235,250,${(pulse * 0.8).toFixed(3)})`,
          }}
        >
          So'nggi
        </div>

        {/* Ajratuvchi chiziq: har almashishda nur yugurib o'tadi */}
        <div style={{ position: "relative", width: 560, height: 2, margin: "34px 0 10px", opacity: appear * (1 - dissolve) }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent, rgba(233,220,203,.35), transparent)" }} />
          <div
            style={{
              position: "absolute",
              top: -2,
              height: 6,
              width: 160,
              left: -160 + (1 - pulse) * 720,
              background: "radial-gradient(ellipse at 50% 50%, rgba(255,240,220,.95), rgba(255,240,220,0) 70%)",
              opacity: pulse,
            }}
          />
        </div>

        {/* Almashadigan so'z (slot) */}
        <div
          style={{
            position: "relative",
            width: L.width,
            height: slotH,
            overflow: "hidden",
            WebkitMaskImage: "linear-gradient(180deg, transparent 0%, #000 22%, #000 78%, transparent 100%)",
            maskImage: "linear-gradient(180deg, transparent 0%, #000 22%, #000 78%, transparent 100%)",
          }}
        >
          {slots.map((s, i) => {
            const inn = spring({ frame: frame - f(s.start), fps, config: { damping: 18, stiffness: 170, mass: 0.7 } });
            const next = slots[i + 1];
            const out = next ? spring({ frame: frame - f(next.start), fps, config: { damping: 200, stiffness: 200 } }) : 0;
            if (inn < 0.001 || out > 0.999) return null;
            const y = (1 - inn) * 160 - out * 170;
            const blur = Math.abs(1 - Math.min(1, inn)) * 14 + out * 16 + dissolve * 18;
            const isLast = !next;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  height: slotH,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: fonts.title,
                  fontWeight: 500,
                  fontSize: 200,
                  lineHeight: 1,
                  letterSpacing: `${0.04 + dissolve * 0.3}em`,
                  color: isLast ? "#fff4e6" : colors.ink,
                  opacity: Math.min(1, inn) * (1 - out) * (1 - dissolve),
                  transform: `translateY(${y.toFixed(1)}px) scale(${(0.92 + 0.08 * Math.min(1, inn) + (isLast ? pulse * 0.05 : 0)).toFixed(4)})`,
                  filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined,
                  textShadow: `0 0 ${isLast ? 70 : 40}px rgba(255,220,180,${isLast ? 0.55 : 0.3})`,
                }}
              >
                {clean(s.w)}
              </div>
            );
          })}
        </div>

        {/* Hisoblagich: 3 ta chiziq */}
        <div style={{ display: "flex", gap: 18, marginTop: 26, opacity: appear * (1 - dissolve) }}>
          {anchors.map((_, i) => (
            <div
              key={i}
              style={{
                width: 64,
                height: 3,
                borderRadius: 2,
                background: i < count ? colors.ink : "rgba(233,220,203,.18)",
                boxShadow: i < count ? "0 0 12px rgba(255,235,210,.6)" : undefined,
              }}
            />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
