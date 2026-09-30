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
import { fonts, moments, timing, track } from "./config";
import { Background } from "./components/Background";
import { CoverPanel } from "./components/CoverPanel";
import { cameraAt, Effects } from "./components/Effects";
import { LastWords, lastWordsAmount } from "./components/LastWords";
import { LyricsPanel } from "./components/LyricsPanel";
import { Outro } from "./components/Outro";
import { PhoneCall, phoneAmount } from "./components/PhoneCall";
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

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

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
  const phone = phoneAmount(t);
  const last = lastWordsAmount(t);

  // Intro: sarlavha drop'gacha turadi va drop'da o'zi parchalanadi; matn drop bilan birga kiradi
  const drop = moments.introDrop;
  const introPhase = t < drop + 1;
  const visOpacity = (introPhase ? 1 : instr) * (1 - phone);
  const lyricsOpacity =
    (introPhase ? interpolate(t, [drop + 0.12, drop + 0.42], [0, 1], clamp) : 1 - instr) * (1 - phone) * (1 - last);

  const outroStart = durationInFrames - Math.round(timing.outroSeconds * fps);
  const mainOpacity = interpolate(frame, [outroStart, outroStart + fps * 0.8], [1, 0], clamp);
  const cam = cameraAt(t, frame, pulse);

  return (
    <AbsoluteFill style={{ fontFamily: fonts.ui, backgroundColor: "#050403" }}>
      <Audio src={staticFile(track.audio)} />
      <AbsoluteFill
        style={{ transform: `translate(${cam.x.toFixed(2)}px, ${cam.y.toFixed(2)}px) scale(${cam.scale.toFixed(4)})` }}
      >
        <Background mood={mood} pulse={pulse} />
        {fontsReady && (
          <AbsoluteFill style={{ opacity: mainOpacity }}>
            <CoverPanel pulse={pulse} dim={Math.max(phone, last * 0.6)} />
            <Visualizer opacity={visOpacity} />
            <LyricsPanel opacity={lyricsOpacity} />
            <PhoneCall />
            <LastWords />
          </AbsoluteFill>
        )}
      </AbsoluteFill>
      <Effects />
      <Sequence from={outroStart} name="Outro">
        {fontsReady && <Outro />}
      </Sequence>
    </AbsoluteFill>
  );
};
