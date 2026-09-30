import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, texts, track } from "../config";
import { PlatformIcons } from "./PlatformIcons";

/** Oxirgi 4 soniya: "Tinglang" + katta ikonlar (Sequence ichida, kadr 0 dan boshlanadi) */
export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const fadeIn = interpolate(frame, [0, fps * 0.8], [0, 1], { extrapolateRight: "clamp" });
  const title = interpolate(frame, [fps * 0.3, fps * 1.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const footer = interpolate(frame, [fps * 1.4, fps * 2.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - fps * 0.6, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut }}>
      <AbsoluteFill style={{ background: colors.bg }} />
      <Img
        src={staticFile(track.coverBlur)}
        style={{ position: "absolute", left: -200, top: -560, width: 2320, height: 2320, objectFit: "cover", opacity: 0.85 }}
      />
      <AbsoluteFill style={{ background: "rgba(8,6,5,.72)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%,rgba(0,0,0,0) 0%,rgba(3,2,2,.75) 100%)" }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: -40,
          height: 600,
          background: "radial-gradient(ellipse at 50% 100%,rgba(200,170,135,.2),rgba(0,0,0,0) 70%)",
        }}
      />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 72, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontFamily: fonts.title,
            fontWeight: 500,
            fontSize: 190,
            lineHeight: 1,
            letterSpacing: ".08em",
            paddingLeft: ".08em",
            color: colors.ink,
            textShadow: "0 6px 50px rgba(0,0,0,.6)",
            opacity: title,
            transform: `translateY(${(1 - title) * 30}px)`,
          }}
        >
          {texts.listen}
        </div>
        <PlatformIcons variant="large" startFrame={Math.round(fps * 0.7)} />
        <div
          style={{
            fontFamily: fonts.ui,
            fontSize: 30,
            fontWeight: 300,
            letterSpacing: ".42em",
            paddingLeft: ".42em",
            textTransform: "uppercase",
            color: colors.accent,
            opacity: footer,
          }}
        >
          {track.title} · {track.artists}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
