"""
Matn-audio forced alignment (modelsiz, DSP asosida).

Kirish:
  lyrics.txt               — [Rina]/[Hasanboy] sarlavhali matn
  analysis/sections.json   — bo'limlar xaritasi (qatorlar oralig'i -> vaqt oralig'i)
  analysis/vocals.wav      — ajratilgan vokal (demucs yoki scripts/separate_vocals.py)
Chiqish:
  src/data/lyrics.json         — [{singer, line, start, end, words:[{w,start,end}], confidence, ...}]
  analysis/alignment_report.md — ishonchi past qatorlar ro'yxati

Usul:
  1. Vokal faolligi signali = silero-VAD ehtimoli + vokal diapazoni (300–3500 Hz) energiyasi.
  2. Har bo'lim ichida qator chegaralari dinamik dasturlash bilan topiladi:
     chegara past faollikka (nafas/pauza) tushsin, qator uzunligi bo'g'in soniga mutanosib bo'lsin.
  3. So'zlar qator ichida bo'g'inlar bo'yicha, faollik massasiga qarab taqsimlanadi.
"""
import json
import re
from pathlib import Path

import librosa
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
LYRICS = ROOT / "lyrics.txt"
SECTIONS = ROOT / "analysis" / "sections.json"
VOCALS = ROOT / "analysis" / "vocals.wav"
OUT = ROOT / "src" / "data" / "lyrics.json"
REPORT = ROOT / "analysis" / "alignment_report.md"

RES = 100  # faollik signali: 100 kadr/soniya
STEP = 5  # DP qadami: 5 kadr = 50 ms
LOW_CONFIDENCE = 0.6


# ---------------------------------------------------------------- matn
def parse_lyrics(path: Path) -> list[dict]:
    lines, singer = [], None
    for raw in path.read_text(encoding="utf-8").splitlines():
        s = raw.strip()
        m = re.fullmatch(r"\[(.+?)\]", s)
        if m:
            singer = m.group(1)
            continue
        if s:
            lines.append({"singer": singer, "line": s})
    return lines


def syllables(word: str) -> int:
    """O'zbek lotin yozuvida bo'g'in = unli harf (a, e, i, o, u, o')."""
    return max(1, len(re.findall(r"[aeiouAEIOU]", word)))


# ---------------------------------------------------------------- audio
def activity_signal() -> np.ndarray:
    import torch
    from silero_vad import load_silero_vad

    v16, _ = librosa.load(VOCALS, sr=16000)
    model = load_silero_vad(onnx=True)
    probs = np.array([
        float(model(torch.tensor(v16[i:i + 512]), 16000))
        for i in range(0, len(v16) - 512, 512)
    ])
    t_vad = np.arange(len(probs)) * 512 / 16000

    sr, hop = 22050, 256
    y, _ = librosa.load(VOCALS, sr=sr)
    S = np.abs(librosa.stft(y, n_fft=1024, hop_length=hop))
    fr = librosa.fft_frequencies(sr=sr, n_fft=1024)
    band = librosa.amplitude_to_db(np.sqrt((S[(fr > 300) & (fr < 3500)] ** 2).mean(0)) + 1e-6)
    t_band = np.arange(len(band)) * hop / sr

    n = int(len(y) / sr * RES)
    t = np.arange(n) / RES
    return np.interp(t, t_vad, probs), np.interp(t, t_band, band)


def section_activity(vad: np.ndarray, band: np.ndarray, a: int, b: int) -> np.ndarray:
    seg = band[a:b]
    lo, hi = np.percentile(seg, 10), np.percentile(seg, 90)
    z = np.clip((seg - lo) / max(hi - lo, 1e-6), 0, 1)
    act = 0.5 * vad[a:b] + 0.5 * z
    k = 5
    return np.convolve(act, np.ones(k) / k, mode="same")


# ---------------------------------------------------------------- DP
def split_section(act: np.ndarray, syl: list[int]) -> tuple[list[int], float]:
    """Bo'lim (faollik massivi) ni len(syl) ta qatorga bo'luvchi chegaralar (kadr indekslari)."""
    n, T = len(syl), len(act)
    grid = np.arange(0, T + 1, STEP)
    grid[-1] = T
    G = len(grid)
    # chegara narxi: atrofidagi (±100 ms) o'rtacha faollik
    pad = np.pad(act, 10, mode="edge")
    gap = np.array([pad[g:g + 21].mean() for g in grid])
    rate = T / sum(syl)  # kadr / bo'g'in

    INF = 1e18
    cost = np.full((n + 1, G), INF)
    back = np.zeros((n + 1, G), dtype=int)
    cost[0, 0] = 0
    for i in range(1, n + 1):
        exp = rate * syl[i - 1]
        for j in range(1, G):
            dur = grid[j] - grid[:j]
            ok = (dur > 0.35 * exp) & (dur < 2.6 * exp)
            if not ok.any():
                continue
            c = cost[i - 1, :j] + 4.0 * np.log(np.maximum(dur, 1) / exp) ** 2 + (gap[j] if i < n else 0)
            c = np.where(ok, c, INF)
            k = int(np.argmin(c))
            cost[i, j], back[i, j] = c[k], k
    bounds, j = [G - 1], G - 1
    for i in range(n, 0, -1):
        j = back[i, j]
        bounds.append(j)
    return [int(grid[x]) for x in reversed(bounds)], rate


def trim(act: np.ndarray, a: int, b: int, thr: float = 0.5) -> tuple[int, int]:
    on = np.where(act[a:b] > thr)[0]
    if len(on) == 0:
        return a, b
    s = a + min(on[0], int(0.6 * RES))
    e = a + max(on[-1] + 1, (b - a) - int(0.8 * RES))
    return s, max(e, s + int(0.3 * RES))


def word_times(act: np.ndarray, a: int, b: int, words: list[str]) -> list[tuple[float, float]]:
    mass = np.cumsum(np.maximum(act[a:b], 0.05))
    mass /= mass[-1]
    syl = np.array([syllables(w) for w in words], dtype=float)
    frac = np.concatenate([[0], np.cumsum(syl) / syl.sum()])
    idx = [a + int(np.searchsorted(mass, f)) for f in frac[:-1]] + [b]
    return [(idx[i], max(idx[i + 1], idx[i] + 8)) for i in range(len(words))]


def refine_starts(secs: list[dict]) -> None:
    """Guruhdagi har bo'lim start'ini 1-bo'lim bilan vokal chroma korrelyatsiyasi orqali ±0.5 s ichida aniqlashtiradi."""
    sr, hop = 22050, 256
    y, _ = librosa.load(VOCALS, sr=sr)
    C = librosa.util.normalize(librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop), axis=0)
    fps = sr / hop
    ref0 = int(secs[0]["start"] * fps)
    L = int(min(s["end"] - s["start"] for s in secs) * fps)
    ref = C[:, ref0:ref0 + L]
    for sec in secs[1:]:
        c0, w = int(sec["start"] * fps), int(0.5 * fps)
        scores = [
            np.mean(np.sum(C[:, c0 + d:c0 + d + L] * ref, axis=0)) if c0 + d + L <= C.shape[1] else -1
            for d in range(-w, w + 1)
        ]
        shift = (int(np.argmax(scores)) - w) / fps
        sec["start"] = round(sec["start"] + shift, 2)
        sec["end"] = round(sec["end"] + shift, 2)


# ---------------------------------------------------------------- main
def main() -> None:
    lines = parse_lyrics(LYRICS)
    sections = json.loads(SECTIONS.read_text(encoding="utf-8"))["sections"]
    vad, band = activity_signal()

    # Guruhlangan bo'limlar (xor takrorlari): start'ni vokal chroma bo'yicha aniqlashtirish,
    # so'ng faollikni o'rtachalab, DP ni bir marta ishlatish.
    groups: dict[str, list[dict]] = {}
    for sec in sections:
        if sec.get("group"):
            groups.setdefault(sec["group"], []).append(sec)
    shared: dict[str, tuple[np.ndarray, list[int], float]] = {}
    for name, secs in groups.items():
        refine_starts(secs)
        L = min(int((s["end"] - s["start"]) * RES) for s in secs)
        acts = [section_activity(vad, band, int(s["start"] * RES), int(s["start"] * RES) + L) for s in secs]
        act = np.mean(acts, axis=0)
        chunk = lines[secs[0]["lines"][0] - 1:secs[0]["lines"][1]]
        syl = [sum(syllables(w) for w in ln["line"].split()) for ln in chunk]
        bounds, rate = split_section(act, syl)
        shared[name] = (act, bounds, rate)

    out = []
    for sec in sections:
        l0, l1 = sec["lines"]
        chunk = lines[l0 - 1:l1]
        a = int(sec["start"] * RES)
        syl = [sum(syllables(w) for w in ln["line"].split()) for ln in chunk]
        if sec.get("group"):
            act, bounds, rate = shared[sec["group"]]
        else:
            act = section_activity(vad, band, a, int(sec["end"] * RES))
            bounds, rate = split_section(act, syl)
        cap = sec.get("confidenceCap", 1.0)

        def gap_at(x: int) -> float:
            return float(act[max(0, x - 10):x + 10].mean()) if 0 < x < len(act) else 0.0

        for i, ln in enumerate(chunk):
            ba, bb = bounds[i], bounds[i + 1]
            s, e = trim(act, ba, bb)
            words = ln["line"].split()
            wt = word_times(act, s, e, words)

            # ishonch: chegaralar pauzaga tushganmi + uzunlik bo'g'inlarga mosmi + qator ichida faollik bormi
            boundary_q = 1 - (gap_at(ba) + gap_at(bb)) / 2
            dur_fit = float(np.exp(-4 * np.log((bb - ba) / (rate * syl[i])) ** 2))
            coverage = float((act[s:e] > 0.5).mean())
            conf = min(cap, 0.4 * boundary_q + 0.4 * dur_fit + 0.2 * coverage)

            out.append({
                "index": l0 + i,
                "singer": ln["singer"],
                "section": sec["name"],
                "line": ln["line"],
                "start": round((a + s) / RES, 2),
                "end": round((a + e) / RES, 2),
                "words": [
                    {"w": w, "start": round((a + ws) / RES, 2), "end": round((a + we) / RES, 2)}
                    for w, (ws, we) in zip(words, wt)
                ],
                "confidence": round(conf, 2),
            })

    notes = {s["name"]: s.get("note") for s in sections if s.get("note")}
    write_outputs(out, notes)


def write_outputs(out: list[dict], notes: dict[str, str] | None = None) -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")

    low = [x for x in out if x["confidence"] < LOW_CONFIDENCE]
    rows = [
        "# Alignment hisoboti\n",
        f"Jami qatorlar: {len(out)}. Ishonchi past (< {LOW_CONFIDENCE}): {len(low)}.\n",
        "| # | Ovoz | Qator | Boshlanish | Tugash | Ishonch |",
        "|---|------|-------|-----------:|-------:|--------:|",
    ]
    rows += [
        f"| {x['index']} | {x['singer']} | {x['line']} | {x['start']:.2f} | {x['end']:.2f} | "
        f"{'**' + str(x['confidence']) + '**' if x['confidence'] < LOW_CONFIDENCE else x['confidence']} |"
        for x in out
    ]
    if notes:
        rows += ["", "## Bo'lim izohlari", *[f"- **{k}**: {v}" for k, v in notes.items()]]
    REPORT.write_text("\n".join(rows) + "\n", encoding="utf-8")

    for x in out:
        flag = "  <-- PAST" if x["confidence"] < LOW_CONFIDENCE else ""
        print(f"{x['index']:>2} {x['singer']:<8} {x['start']:7.2f}-{x['end']:7.2f}  {x['confidence']:.2f}  {x['line']}{flag}")
    print(f"\n-> {OUT}\n-> {REPORT}\nIshonchi past: {len(low)} / {len(out)}")

if __name__ == "__main__":
    main()
