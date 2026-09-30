import React from "react";
import { Composition, staticFile } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { FPS, HEIGHT, track, WIDTH } from "./config";
import { LyricVideo } from "./LyricVideo";
import { audio } from "./lib/timeline";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="LyricVideo"
    component={LyricVideo}
    width={WIDTH}
    height={HEIGHT}
    fps={FPS}
    durationInFrames={Math.ceil(audio.duration * FPS)}
    calculateMetadata={async () => {
      // Davomiylik = track.mp3 davomiyligi
      const seconds = await getAudioDurationInSeconds(staticFile(track.audio));
      return { durationInFrames: Math.ceil(seconds * FPS) };
    }}
  />
);
