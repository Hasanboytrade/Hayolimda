import React from "react";
import { Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, layout, texts, track } from "../config";
import { PlatformIcons } from "./PlatformIcons";

type Props = { pulse: number };

export const CoverPanel: React.FC<Props> = ({ pulse }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const L = layout.left;

  // Sekin "nafas": 1.00 -> 1.03 (~7 s davr) + bass'ga yengil pulse
  const breath = 1 + 0.015 * (1 - Math.cos((t / 7) * Math.PI * 2));
  const scale = breath + pulse * 0.012;

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
      <Img
        src={staticFile(track.cover)}
        style={{
          width: L.coverSize,
          height: L.coverSize,
          borderRadius: L.radius,
          objectFit: "cover",
          opacity: appear,
          transform: `translateY(${(1 - appear) * 20}px) scale(${scale})`,
          boxShadow: `0 40px 90px rgba(0,0,0,${0.62 + pulse * 0.08}), 0 0 0 1px rgba(233,220,203,.06), 0 0 ${60 + pulse * 40}px rgba(216,180,140,${0.05 + pulse * 0.06})`,
        }}
      />
      <PlatformIcons variant="row" startFrame={Math.round(fps * 0.6)} />
      <div
        style={{
          fontFamily: fonts.ui,
          fontSize: 24,
          fontWeight: 300,
          letterSpacing: ".14em",
          color: colors.caption,
          opacity: caption,
        }}
      >
        {texts.listenEverywhere}
      </div>
    </div>
  );
};
