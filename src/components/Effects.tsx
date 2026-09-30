import React from "react";
import { AbsoluteFill, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { layout, moments } from "../config";

/** Zarba (drop) paytidagi kamera "punch" va tebranish */
export const cameraAt = (t: number, frame: number, pulse: number) => {
  let punch = 0;
  let shake = 0;
  for (const d of [moments.introDrop, moments.verseDrop]) {
    const x = t - d;
    if (x >= 0 && x < 2) {
      punch = Math.max(punch, 0.045 * Math.exp(-x / 0.32));
      shake = Math.max(shake, 9 * Math.exp(-x / 0.18));
    }
  }
  const sx = (random(`cx${frame}`) - 0.5) * shake;
  const sy = (random(`cy${frame}`) - 0.5) * shake;
  return { scale: 1 + punch + pulse * 0.006, x: sx, y: sy };
};

export const Effects: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const cx = layout.lyrics.x + layout.lyrics.width / 2;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Flash + anamorfik nur chizig'i */}
      {moments.flashes.map((f, i) => {
        const x = t - f.t;
        if (x < -0.06 || x > 1.6) return null;
        const a = x < 0 ? (x + 0.06) / 0.06 : Math.exp(-x / 0.28);
        const k = a * f.strength;
        return (
          <React.Fragment key={i}>
            <AbsoluteFill
              style={{
                background: `radial-gradient(ellipse at ${cx}px 540px, rgba(${f.rgb},${(1.0 * k).toFixed(3)}) 0%, rgba(${f.rgb},${(0.45 * k).toFixed(3)}) 40%, rgba(${f.rgb},0) 75%)`,
                mixBlendMode: "screen",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: -200,
                right: -200,
                top: 540 - 3,
                height: 6,
                background: `linear-gradient(90deg, rgba(${f.rgb},0) 0%, rgba(${f.rgb},${(0.9 * k).toFixed(3)}) 50%, rgba(${f.rgb},0) 100%)`,
                filter: "blur(2px)",
                transform: `scaleX(${(0.4 + 0.8 * (1 - a)).toFixed(3)})`,
                mixBlendMode: "screen",
              }}
            />
          </React.Fragment>
        );
      })}

      {/* Shockwave halqalari */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {[moments.introDrop, moments.verseDrop].flatMap((d, i) =>
          [0, 0.09].map((delay, j) => {
            const x = (t - d - delay) / 1.1;
            if (x < 0 || x > 1) return null;
            const e = 1 - Math.pow(1 - x, 3);
            return (
              <circle
                key={`${i}-${j}`}
                cx={cx}
                cy={540}
                r={40 + e * 1300}
                fill="none"
                stroke={i === 0 ? "rgb(255,225,190)" : "rgb(200,220,240)"}
                strokeWidth={(1 - x) * (j === 0 ? 10 : 4) + 0.5}
                opacity={(1 - x) * (j === 0 ? 0.55 : 0.35)}
              />
            );
          }),
        )}
      </svg>

      {/* Vignette */}
      <AbsoluteFill
        style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,.45) 100%)" }}
      />

      {/* Film grain */}
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile("grain.svg")})`,
          backgroundSize: "512px 512px",
          backgroundPosition: `${Math.floor(random(`gx${frame}`) * 512)}px ${Math.floor(random(`gy${frame}`) * 512)}px`,
          opacity: 0.075,
          mixBlendMode: "overlay",
        }}
      />
    </AbsoluteFill>
  );
};
