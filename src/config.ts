/**
 * Lirik video uchun yagona sozlamalar fayli.
 * Ranglar, shriftlar, ikonlar, trek/artist nomlari, ovozlar va kayfiyat shu yerda.
 *
 * Ranglar cover'dan olingan (npm run palette -> src/data/palette.json):
 *   Vibrant #ccab8e, LightVibrant #d5b698, Muted #a48368, DarkMuted #524235, DarkVibrant #4c2e24.
 * Cover deyarli to'liq iliq monoxrom, shuning uchun Hasanboyning sovuq rangi
 * cover'ning Muted tonini sovuq (ko'k-kulrang) tomonga ko'chirish orqali olingan.
 */

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const track = {
  title: "Xayolimda",
  artists: "Hasanboy & Rina",
  audio: "track.mp3",
  cover: "cover.jpg",
  coverBlur: "cover-blur.jpg",
};

export type Singer = "Rina" | "Hasanboy";

export const voices: Record<Singer, { label: string; color: string; glow: string; text: string }> = {
  // Iliq/yumshoq: cover'ning LightVibrant oilasi
  Rina: { label: "Rina", color: "#e8b98a", glow: "rgba(232,185,138,.45)", text: "#f0c9a0" },
  // Sovuq/chuqur: cover'ning Muted toni, sovuq tomonga ko'chirilgan
  Hasanboy: { label: "Hasanboy", color: "#8fa3b5", glow: "rgba(143,163,181,.45)", text: "#a9bccd" },
};

export const colors = {
  bg: "#0a0705",
  ink: "#f1e4d1", // asosiy matn (krem)
  inkSoft: "#e9dccb",
  inkDim: "rgba(241,228,209,.35)", // hali aytilmagan so'zlar
  caption: "#b9a48c",
  accent: "#d8b48c",
  dust: "#e6c49c",
  dustCold: "#c9d2da",
  butterfly: "#d9b48a",
  bokeh: "224,178,130", // rgb
  bokehCold: "143,163,181",
};

export const fonts = {
  // Dizayn fayllaridagi shriftlar. Montserrat yoki Inter kerak bo'lsa, lyrics: "Montserrat" / "Inter" qiling.
  lyrics: "Jost",
  ui: "Jost",
  title: "Cormorant Garamond",
  files: [
    { family: "Jost", weight: 300, file: "fonts/jost-latin-300-normal.woff2" },
    { family: "Jost", weight: 400, file: "fonts/jost-latin-400-normal.woff2" },
    { family: "Jost", weight: 500, file: "fonts/jost-latin-500-normal.woff2" },
    { family: "Jost", weight: 600, file: "fonts/jost-latin-600-normal.woff2" },
    { family: "Jost", weight: 700, file: "fonts/jost-latin-700-normal.woff2" },
    { family: "Cormorant Garamond", weight: 400, file: "fonts/cormorant-garamond-latin-400-normal.woff2" },
    { family: "Cormorant Garamond", weight: 500, file: "fonts/cormorant-garamond-latin-500-normal.woff2" },
    { family: "Montserrat", weight: 400, file: "fonts/montserrat-latin-400-normal.woff2" },
    { family: "Montserrat", weight: 600, file: "fonts/montserrat-latin-600-normal.woff2" },
    { family: "Montserrat", weight: 700, file: "fonts/montserrat-latin-700-normal.woff2" },
    { family: "Inter", weight: 400, file: "fonts/inter-latin-400-normal.woff2" },
    { family: "Inter", weight: 600, file: "fonts/inter-latin-600-normal.woff2" },
    { family: "Inter", weight: 700, file: "fonts/inter-latin-700-normal.woff2" },
  ],
};

export const platforms = [
  { id: "spotify", name: "Spotify", icon: "icons/spotify.svg" },
  { id: "apple-music", name: "Apple Music", icon: "icons/apple-music.svg" },
  { id: "youtube-music", name: "YouTube Music", icon: "icons/youtube-music.svg" },
  { id: "yandex-music", name: "Yandex Music", icon: "icons/yandex-music.svg" },
  { id: "deezer", name: "Deezer", icon: "icons/deezer.svg" },
  { id: "vk-music", name: "VK Music", icon: "icons/vk-music.svg" },
];

export const texts = {
  listenEverywhere: "Hamma platformalarda tinglang",
  listen: "Tinglang",
};

export const iconStyle: "mono" | "original" = "mono"; // mono: krem rangdagi silueta (dizayndagidek)

export const timing = {
  introSeconds: 3,
  outroSeconds: 4,
  /** Qator shuncha soniya oldin "faol" bo'ladi (ko'z oldindan o'qishi uchun) */
  lineLead: 0.15,
  /** Shu soniyadan uzun matnsiz joy — instrumental (equalizer + trek nomi) */
  instrumentalGap: 3.5,
};

export const layout = {
  left: { x: 120, width: 700, coverSize: 600, radius: 24, gap: 40 },
  icons: { size: 48, gap: 28, opacity: 0.85 },
  lyrics: {
    x: 960,
    width: 860,
    activeMaxSize: 88,
    activeMaxLines: 2,
    /** Faol qator bir qatorda shu o'lchamdan kichik bo'lib qolsa, 2 qatorga bo'linadi */
    singleLineMinSize: 66,
    inactiveSize: 44,
    gap: 40,
    labelHeight: 24,
    labelGap: 18,
  },
};

/**
 * Bo'limga qarab fon kayfiyati. 0..1 oralig'ida:
 *  brightness — fon yorqinligi, cool — sovuq tus aralashmasi, dust — zarrachalar zichligi, haze — chang pardasi
 */
export const moods = {
  instrumental: { brightness: 0.55, cool: 0.2, dust: 0.35, haze: 0.1, rain: 0 },
  Rina: { brightness: 0.85, cool: 0, dust: 0.3, haze: 0.05, rain: 0 },
  Hasanboy: { brightness: 0.35, cool: 1, dust: 0.55, haze: 0.15, rain: 0.6 },
  // "Xuddi ko'chalar to'lganda changga / Yetishmaydi havo tanga" — changli ko'cha, bo'g'ilish
  dust: { brightness: 0.3, cool: 0.4, dust: 1, haze: 0.85, rain: 0 },
};

/** Changli kayfiyat qo'llanadigan qatorlar (lyrics.txt dagi tartib raqami) */
export const dustLines = [32, 33, 34];
