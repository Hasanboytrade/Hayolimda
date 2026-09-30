import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  continueRender,
  delayRender,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fonts, timing, track } from "./config";
import { Background } from "./components/Background";
import { CoverPanel } from "./components/CoverPanel";
import { LyricsPanel } from "./components/LyricsPanel";
import { Outro } from "./components/Outro";
import { Visualizer } from "./components/Visualizer";
import { bassPulse, instrumentalAmount, instrumentalRanges, moodAt } from "./lib/timeline";

const useFonts = () => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender("Shriftlar yuklanmoqda"));
  useEffect(() => {
    Promise.all(
      fonts.files.map(async (f) => {
        const face = new FontFace(f.family, `url(${staticFile(f.file)}) format("woff2")`, { weight: String(f.weight) });
        await face.load();
        document.fonts.add(face);
      }),
    )
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch((err) => {
        console.error(err);
        continueRender(handle);
        setReady(true);
      });
  }, [handle]);
  return ready;
};

export const LyricVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const fontsReady = useFonts();
  const t = frame / fps;
  const duration = durationInFrames / fps;

  const ranges = instrumentalRanges(duration);
  const instr = instrumentalAmount(t, ranges);
  const mood = moodAt(t, ranges);
  const pulse = bassPulse(frame);

  const outroStart = durationInFrames - Math.round(timing.outroSeconds * fps);
  const mainOpacity = interpolate(frame, [outroStart, outroStart + fps * 0.8], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ fontFamily: fonts.ui }}>
      <Audio src={staticFile(track.audio)} />
      <Background mood={mood} pulse={pulse} />
      {fontsReady && (
        <AbsoluteFill style={{ opacity: mainOpacity }}>
          <CoverPanel pulse={pulse} />
          <Visualizer opacity={instr} />
          <LyricsPanel opacity={1 - instr} />
        </AbsoluteFill>
      )}
      <Sequence from={outroStart} name="Outro">
        {fontsReady && <Outro />}
      </Sequence>
    </AbsoluteFill>
  );
};
