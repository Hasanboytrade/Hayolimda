import lyricsData from "../data/lyrics.json";
import audioData from "../data/audio-analysis.json";
import { dustLines, moods, timing, type Singer } from "../config";

export type Word = { w: string; start: number; end: number };
export type LyricLine = {
  index: number;
  singer: Singer;
  section: string;
  line: string;
  start: number;
  end: number;
  words: Word[];
  confidence: number;
};

export const lyrics = (lyricsData as LyricLine[]).slice().sort((a, b) => a.start - b.start);

type AudioAnalysis = {
  fps: number;
  duration: number;
  frames: number;
  bpm: number;
  beats: number[];
  energy: number[];
  energySmooth: number[];
  bass: number[];
  bassHit: number[];
  spectrum: number[][];
};
export const audio = audioData as AudioAnalysis;

const at = (arr: number[], frame: number) => arr[Math.max(0, Math.min(arr.length - 1, Math.round(frame)))] ?? 0;

/** Bass pulse: tez ko'tarilib, sekin so'nadigan envelope (0..1) */
export const bassPulse = (frame: number): number => {
  let v = 0;
  for (let k = 0; k < 8; k++) {
    v = Math.max(v, at(audio.bassHit, frame - k) * Math.exp(-k / 3));
  }
  return Math.min(1, v * 0.6 + at(audio.bass, frame) * 0.4);
};

export const energy = (frame: number) => at(audio.energySmooth, frame);
export const spectrum = (frame: number) => audio.spectrum[Math.max(0, Math.min(audio.spectrum.length - 1, Math.round(frame)))] ?? [];

/** Hozirgi faol qator indeksi (lyrics massivida) yoki -1 (birinchi qatordan oldin) */
export const activeLineIndex = (t: number): number => {
  let idx = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i].start - timing.lineLead <= t) idx = i;
    else break;
  }
  return idx;
};

/** Matnsiz (instrumental) joylar: [start, end] soniyada */
export const instrumentalRanges = (duration: number): [number, number][] => {
  const ranges: [number, number][] = [];
  // Boshidan birinchi qatorgacha: intro sarlavhasi + instrumental (fade-in'siz, 0 dan)
  let prevEnd = -2;
  for (const l of lyrics) {
    if (l.start - prevEnd >= timing.instrumentalGap) ranges.push([prevEnd + 0.6, l.start - 0.9]);
    prevEnd = Math.max(prevEnd, l.end);
  }
  if (duration - prevEnd >= timing.instrumentalGap) ranges.push([prevEnd + 0.6, duration]);
  return ranges;
};

/** 0..1: instrumental rejimga qanchalik kirilgan (0.6 s silliq o'tish bilan) */
export const instrumentalAmount = (t: number, ranges: [number, number][]): number => {
  const fade = 0.6;
  let v = 0;
  for (const [a, b] of ranges) {
    const inV = Math.min(1, Math.max(0, (t - a) / fade));
    const outV = Math.min(1, Math.max(0, (b - t) / fade));
    v = Math.max(v, Math.min(inV, outV));
  }
  return v;
};

export type Mood = { brightness: number; cool: number; dust: number; haze: number; rain: number };

const moodTarget = (t: number, ranges: [number, number][]): Mood => {
  if (instrumentalAmount(t, ranges) > 0.5 || t < lyrics[0]?.start - 1) return moods.instrumental;
  const i = activeLineIndex(t);
  const line = lyrics[Math.max(0, i)];
  if (dustLines.includes(line.index)) return moods.dust;
  return moods[line.singer];
};

/** Kayfiyat: oxirgi ~1.5 s dagi maqsadli qiymatlar o'rtachasi -> silliq, deterministik o'tish */
export const moodAt = (t: number, ranges: [number, number][]): Mood => {
  const N = 16;
  const acc: Mood = { brightness: 0, cool: 0, dust: 0, haze: 0, rain: 0 };
  for (let k = 0; k < N; k++) {
    const m = moodTarget(t - k * 0.1, ranges);
    for (const key of Object.keys(acc) as (keyof Mood)[]) acc[key] += m[key] / N;
  }
  return acc;
};
