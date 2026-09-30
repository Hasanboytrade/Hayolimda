import React from "react";
import { Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, layout, texts, track } from "../config";
import { PlatformIcons } from "./PlatformIcons";

type Props = { pulse: number; dim?: number };

export const CoverPanel: React.FC<Props> = ({ pulse, dim = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const L = layout.left;

  // Sekin "nafas": 1.00 -> 1.03 (~7 s davr) + bass'ga yengil pulse
  const breath = 1 + 0.015 * (1 - Math.cos((t / 7) * Math.PI * 2));
  const scale = breath + pulse * 0.012;

  // Sekin 3D egilish (parallaks) va yaltiroq nur
  const tiltY = Math.sin(t * 0.17) * 5;
  const tiltX = Math.cos(t * 0.13) * 3;
  const sheenPhase = (t % 11) / 11;
  const sheen = -30 + sheenPhase * 260;

  const appear = interpolate(frame, [0, fps * 1.2], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const caption = interpolate(frame, [fps * 1.2, fps * 2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

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
        gap: L.gap,
      }}
    >
      <div
        style={{
          perspective: 1400,
          opacity: appear * (1 - dim * 0.55),
          transform: `translateY(${(1 - appear) * 20}px)`,
        }}
      >
        <div
          style={{
            position: "relative",
            width: L.coverSize,
            height: L.coverSize,
            borderRadius: L.radius,
            overflow: "hidden",
            transform: `rotateY(${tiltY.toFixed(3)}deg) rotateX(${tiltX.toFixed(3)}deg) scale(${scale})`,
            boxShadow: `${(-tiltY * 4).toFixed(1)}px 40px 90px rgba(0,0,0,${0.62 + pulse * 0.08}), 0 0 0 1px rgba(233,220,203,.06), 0 0 ${60 + pulse * 40}px rgba(216,180,140,${0.05 + pulse * 0.06})`,
          }}
        >
          <Img src={staticFile(track.cover)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          {/* Yaltiroq nur: har ~11 s da cover ustidan o'tadi */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(115deg, rgba(255,240,220,0) ${sheen - 12}%, rgba(255,240,220,.16) ${sheen}%, rgba(255,240,220,0) ${sheen + 12}%)`,
              mixBlendMode: "screen",
            }}
          />
        </div>
      </div>
      <div style={{ opacity: 1 - dim * 0.6 }}>
        <PlatformIcons variant="row" startFrame={Math.round(fps * 0.6)} />
      </div>
      <div
        style={{
          fontFamily: fonts.ui,
          fontSize: 24,
          fontWeight: 300,
          letterSpacing: ".14em",
          color: colors.caption,
          opacity: caption * (1 - dim * 0.6),
        }}
      >
        {texts.listenEverywhere}
      </div>
    </div>
  );
};
