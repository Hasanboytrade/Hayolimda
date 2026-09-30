import React from "react";
import { Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, iconStyle, layout, platforms } from "../config";

const Icon: React.FC<{ src: string; size: number; color: string }> = ({ src, size, color }) =>
  iconStyle === "mono" ? (
    <div
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        WebkitMaskImage: `url(${staticFile(src)})`,
        maskImage: `url(${staticFile(src)})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  ) : (
    <Img src={staticFile(src)} style={{ width: size, height: size, objectFit: "contain" }} />
  );

type Props = {
  variant: "row" | "large";
  /** Animatsiya boshlanadigan kadr (ketma-ket fade-in + slide-up) */
  startFrame?: number;
};

export const PlatformIcons: React.FC<Props> = ({ variant, startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const large = variant === "large";
  const size = large ? 96 : layout.icons.size;
  const stagger = large ? 4 : 5;

  return (
    <div style={{ display: "flex", gap: large ? 64 : layout.icons.gap, alignItems: "flex-start" }}>
      {platforms.map((p, i) => {
        const f = frame - startFrame - i * stagger;
        const k = interpolate(f, [0, fps * 0.6], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        });
        return (
          <div
            key={p.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 18,
              opacity: k * (large ? 1 : layout.icons.opacity),
              transform: `translateY(${(1 - k) * (large ? 30 : 16)}px)`,
            }}
          >
            <Icon src={p.icon} size={size} color={large ? colors.ink : colors.inkSoft} />
            {large && (
              <div style={{ fontFamily: fonts.ui, fontSize: 24, fontWeight: 300, color: colors.caption }}>{p.name}</div>
            )}
          </div>
        );
      })}
    </div>
  );
};
