import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, layout, moments } from "../config";

const HANDSET =
  "M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.46.57 3.58a1 1 0 0 1-.25 1.01l-2.2 2.2z";

const [SCENE_A, SCENE_B] = moments.phoneScene;
const beeps = moments.phoneBeeps;
const BEEP = moments.phoneBeepLength;
const lastBeepEnd = beeps[beeps.length - 1] + BEEP;
const HANGUP = "#c98b7a";

export const phoneAmount = (t: number): number => {
  const inn = interpolate(t, [SCENE_A, SCENE_A + 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const out = interpolate(t, [SCENE_B - 0.35, SCENE_B], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return Math.min(inn, out);
};

/** Telefon gudogi: har gudokda to'lqin, tebranish va nuqta; oxirida "aloqa uzildi" */
export const PhoneCall: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const amount = phoneAmount(t);
  if (amount < 0.005) return null;

  const onBeep = beeps.findIndex((b) => t >= b && t < b + BEEP);
  const beepOn = onBeep >= 0;
  const passed = beeps.filter((b) => t >= b).length;
  const hung = interpolate(t, [lastBeepEnd + 0.05, lastBeepEnd + 0.45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // Har gudokda yorug'lik bir pog'ona pasayadi
  const dark = 0.3 + passed * 0.1 + hung * 0.15;

  const cx = layout.lyrics.x + layout.lyrics.width / 2;
  const cy = 500;
  const shake = beepOn ? 2.2 : 0;
  const q = Math.floor(frame / 1);
  const sx = (random(`px${q}`) - 0.5) * shake;
  const sy = (random(`py${q}`) - 0.5) * shake;
  const iconColor = hung > 0 ? HANGUP : colors.ink;

  // Osiloskop chizig'i: gudok paytida 480+620 Hz aralash to'lqin, keyin tekis chiziq
  const amp = beeps.reduce((m, b) => {
    const x = (t - b) / BEEP;
    return x >= 0 && x <= 1 ? Math.max(m, Math.min(1, x * 12, (1 - x) * 12)) : m;
  }, 0);
  const W = 720;
  const pts: string[] = [];
  for (let i = 0; i <= 180; i++) {
    const x = (i / 180) * W;
    const env = Math.sin((i / 180) * Math.PI);
    const y = amp * 26 * env * (0.6 * Math.sin(x * 0.11 + t * 48) + 0.4 * Math.sin(x * 0.17 - t * 62));
    pts.push(`${x.toFixed(1)},${y.toFixed(2)}`);
  }

  return (
    <AbsoluteFill style={{ opacity: amount }}>
      <AbsoluteFill style={{ background: `rgba(3,3,4,${dark.toFixed(3)})` }} />

      {/* To'lqinlar */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {beeps.flatMap((b, i) =>
          [0, 0.14, 0.28].map((d, j) => {
            const x = (t - b - d) / 1.3;
            if (x < 0 || x > 1) return null;
            const r = 110 + x * 430;
            return (
              <circle
                key={`${i}-${j}`}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={colors.ink}
                strokeWidth={2.2 * (1 - x) + 0.4}
                opacity={(1 - x) * (0.5 - j * 0.12)}
              />
            );
          }),
        )}
      </svg>

      {/* Telefon belgisi */}
      <div
        style={{
          position: "absolute",
          left: cx - 110 + sx,
          top: cy - 110 + sy,
          width: 220,
          height: 220,
          borderRadius: "50%",
          border: `1.5px solid rgba(233,220,203,${beepOn ? 0.7 : 0.35})`,
          background: `radial-gradient(circle, rgba(233,220,203,${beepOn ? 0.16 : 0.05}) 0%, rgba(233,220,203,0) 70%)`,
          boxShadow: beepOn ? "0 0 60px rgba(255,230,200,.25)" : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${beepOn ? 1.05 : 1})`,
        }}
      >
        <svg viewBox="0 0 24 24" width={96} height={96} style={{ transform: `rotate(${hung * 135}deg)`, overflow: "visible" }}>
          <path d={HANDSET} fill={iconColor} opacity={beepOn ? 1 : 0.8} />
        </svg>
      </div>

      <div
        style={{
          position: "absolute",
          left: layout.lyrics.x,
          width: layout.lyrics.width,
          top: cy - 230,
          textAlign: "center",
          fontFamily: fonts.ui,
          fontSize: 24,
          fontWeight: 400,
          letterSpacing: ".5em",
          paddingLeft: ".5em",
          textTransform: "uppercase",
        }}
      >
        <span style={{ color: colors.caption, opacity: Math.max(0, 1 - hung * 2.5), position: "absolute", left: 0, right: 0 }}>
          Qo'ng'iroq
        </span>
        <span style={{ color: HANGUP, opacity: Math.max(0, (hung - 0.5) * 2), position: "absolute", left: 0, right: 0 }}>
          Aloqa uzildi
        </span>
      </div>

      {/* Osiloskop */}
      <svg width={W} height={80} style={{ position: "absolute", left: cx - W / 2, top: cy + 190 }}>
        <polyline
          points={pts.join(" ")}
          transform="translate(0,40)"
          fill="none"
          stroke={hung > 0.5 ? HANGUP : colors.ink}
          strokeOpacity={0.75}
          strokeWidth={2}
        />
      </svg>

      {/* Gudoklar hisoblagichi */}
      <div style={{ position: "absolute", left: cx - 60, top: cy + 300, display: "flex", gap: 20 }}>
        {beeps.map((b, i) => (
          <div
            key={i}
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: i < passed ? (hung > 0.5 ? HANGUP : colors.ink) : "rgba(233,220,203,.2)",
              boxShadow: i === onBeep ? "0 0 16px rgba(255,235,210,.9)" : undefined,
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
