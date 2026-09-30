import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, layout, timing, track } from "../config";
import { spectrum } from "../lib/timeline";

const BARS = 32;

/**
 * O'ng panel, matnsiz joylar uchun: trek nomi + artistlar + yengil equalizer.
 * Boshidagi 3 soniya: katta sarlavha fade-in (intro), keyin equalizer paydo bo'ladi.
 */
export const Visualizer: React.FC<{ opacity: number }> = ({ opacity }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = layout.lyrics;
  const introEnd = timing.introSeconds * fps;

  const titleIn = interpolate(frame, [fps * 0.3, fps * 1.6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const artistIn = interpolate(frame, [fps * 1.0, fps * 2.2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  // Intro tugagach sarlavha kichrayadi va equalizer chiqadi
  const settle = interpolate(frame, [introEnd, introEnd + fps * 1.2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  // Spektr: 16 zona, ko'zgu ko'rinishida 32 ustun, 3 kadr bo'yicha silliqlangan
  const cur = spectrum(frame);
  const prev = spectrum(frame - 1);
  const prev2 = spectrum(frame - 2);
  const bands = cur.map((v, i) => (v * 0.5 + (prev[i] ?? v) * 0.3 + (prev2[i] ?? v) * 0.2));
  const mirrored = [...bands.slice().reverse(), ...bands];

  if (opacity < 0.005) return null;

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
      <div
        style={{
          width: 1,
          height: 90 * (1 - settle),
          marginBottom: 44 * (1 - settle),
          background: `linear-gradient(${colors.accent}00, ${colors.accent})`,
          opacity: titleIn,
        }}
      />
      <div
        style={{
          fontFamily: fonts.title,
          fontWeight: 500,
          fontSize: 176 - 56 * settle,
          lineHeight: 1,
          letterSpacing: ".06em",
          color: colors.ink,
          textShadow: "0 6px 50px rgba(0,0,0,.6)",
          opacity: titleIn,
          transform: `translateY(${(1 - titleIn) * 24}px)`,
        }}
      >
        {track.title}
      </div>
      <div
        style={{
          marginTop: 44 - 16 * settle,
          fontFamily: fonts.ui,
          fontSize: 34 - 8 * settle,
          fontWeight: 300,
          letterSpacing: ".42em",
          paddingLeft: ".42em",
          textTransform: "uppercase",
          color: colors.accent,
          opacity: artistIn,
          transform: `translateY(${(1 - artistIn) * 16}px)`,
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
          opacity: settle * 0.85,
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
