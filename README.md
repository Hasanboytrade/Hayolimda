# Xayolimda — lirik video (Hasanboy & Rina)

Remotion (React + TypeScript) asosidagi lirik video. Format: 1920×1080, 30 fps, davomiyligi `public/track.mp3` bilan bir xil, audio videoga qo'shilgan.

## Tuzilma

```
public/
  track.mp3, cover.jpg          trek va poster
  cover-blur.jpg                fon uchun oldindan blur qilingan cover (scripts/prepare_cover.py)
  icons/*.svg                   streaming ikonlari (spotify, apple-music, youtube-music, yandex-music, deezer, vk-music)
  fonts/*.woff2                 Jost, Cormorant Garamond, Montserrat, Inter (lokal, internet shart emas)
lyrics.txt                      matn: [Rina] / [Hasanboy] sarlavhalari, bo'limlar bo'sh qator bilan
analysis/
  sections.json                 bo'limlar xaritasi (qaysi qatorlar trekning qaysi vaqtida)
  alignment_report.md           alignment natijasi va ishonchi past qatorlar
scripts/
  analyze_audio.py              librosa: BPM, beat, energiya, bass, spektr -> src/data/audio-analysis.json
  separate_vocals.py            modelsiz vokal ajratish (REPET-SIM) -> analysis/vocals.wav
  align_lyrics.py               modelsiz forced alignment -> src/data/lyrics.json
  align_ml.py                   demucs + stable-ts (Whisper, uz) varianti
  palette.mjs                   node-vibrant: cover ranglari -> src/data/palette.json
  prepare_cover.py              public/cover-blur.jpg
src/
  config.ts                     ranglar, shriftlar, ikonlar, nomlar, ovoz ranglari, kayfiyatlar — hammasi shu yerda
  LyricVideo.tsx                asosiy kompozitsiya
  components/                   Background, CoverPanel, PlatformIcons, LyricsPanel, Visualizer, Outro
  lib/timeline.ts               faol qator, instrumental joylar, kayfiyat, bass pulse
  data/                         lyrics.json, audio-analysis.json, palette.json
```

## Ishga tushirish

Talablar: Node.js 18+ va Python 3.10+ (Python faqat tahlil/alignment uchun kerak; tayyor `src/data/*.json` bilan video Python'siz render bo'ladi).

```bash
npm install

# Ko'rib chiqish (brauzerda Remotion Studio)
npm run studio

# MP4 render -> out/lyric-video.mp4
npx remotion render LyricVideo out/lyric-video.mp4
# yoki: npm run render

# Bitta kadrni PNG qilib tekshirish
npx remotion still LyricVideo --frame=1000 out/still.png
```

Chrome'ni Remotion o'zi yuklab oladi. Internet cheklangan bo'lsa, o'rnatilgan Chrome/Chromium yo'lini bering:

```bash
REMOTION_BROWSER_EXECUTABLE=/path/to/chrome npx remotion render LyricVideo out/lyric-video.mp4
```

## Tahlil va alignment'ni qayta ishga tushirish

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r scripts/requirements.txt

python scripts/analyze_audio.py      # BPM, beat, energiya
python scripts/separate_vocals.py    # vokal (modelsiz)
python scripts/align_lyrics.py       # matn alignment
npm run palette                      # cover ranglari
python scripts/prepare_cover.py      # fon uchun blur
```

### ML varianti (aniqroq, internet kerak)

```bash
python scripts/align_ml.py                   # demucs htdemucs --two-stems=vocals + stable-ts large-v3, til: uz
python scripts/align_ml.py --model medium    # yengilroq model
```

Bu skript model vaznlarini `dl.fbaipublicfiles.com` va Whisper serverlaridan yuklaydi. Loyiha yaratilgan muhitda bu hostlar tarmoq siyosati bilan bloklangan edi, shuning uchun u yerda ishga tushirilmagan va sinab ko'rilmagan. Chiqish formati `align_lyrics.py` bilan bir xil.

## Qo'lda tuzatish

- **Bo'lim noto'g'ri joyda bo'lsa:** `analysis/sections.json` dagi `start` va `end` ni o'zgartiring, keyin `python scripts/align_lyrics.py` ni qayta ishga tushiring. Bir xil `group` dagi bo'limlar (xor takrorlari) birgalikda align qilinadi.
- **Bitta qator yoki so'z uchun:** `src/data/lyrics.json` da `start`, `end` va `words[].start/end` ni to'g'ridan-to'g'ri tahrirlang (soniyada). Studio'da darhol ko'rinadi.
- **Ishonchi past qatorlar:** ro'yxat `analysis/alignment_report.md` da.

## Sozlash (`src/config.ts`)

- **`voices`:** Rina (iliq `#e8b98a`) va Hasanboy (sovuq `#8fa3b5`) ranglari va yorliqlari.
- **`fonts.lyrics`:** standart qiymati `"Jost"` (dizayn fayllaridagi shrift). `"Montserrat"` yoki `"Inter"` ga almashtirish mumkin.
- **`platforms` va `iconStyle`:** `"mono"` barcha ikonlarni krem rangdagi silueta qiladi. O'z rangli ikonlaringizni `public/icons/` ga qo'yib, `"original"` qiling.
- **`timing`:** intro 3 s, outro 4 s, instrumental chegarasi.
- **`moods` va `dustLines`:** har bo'lim uchun fon yorqinligi, sovuq tus, zarrachalar zichligi va chang pardasi.
