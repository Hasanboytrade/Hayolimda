"""
ML asosidagi alignment: demucs (htdemucs, --two-stems=vocals) + stable-ts (Whisper, til: o'zbek).

Bu variant model vaznlarini internetdan yuklaydi (dl.fbaipublicfiles.com, openaipublic / huggingface).
Loyiha yaratilgan muhitda bu hostlar bloklangan edi, shuning uchun u yerda scripts/align_lyrics.py
(modelsiz DSP usuli) ishlatilgan. O'z kompyuteringizda shu skript aniqroq natija beradi.

    pip install -r scripts/requirements.txt
    python scripts/align_ml.py                # standart: large-v3 modeli
    python scripts/align_ml.py --model medium --skip-demucs

Chiqish formati scripts/align_lyrics.py bilan bir xil (src/data/lyrics.json + analysis/alignment_report.md).
"""
import argparse
import shutil
import subprocess
import sys
from pathlib import Path

from align_lyrics import LYRICS, ROOT, parse_lyrics, syllables, write_outputs

TRACK = ROOT / "public" / "track.mp3"
VOCALS = ROOT / "analysis" / "vocals.wav"
DEMUCS_OUT = ROOT / "analysis" / "demucs"


def separate() -> None:
    subprocess.run(
        [sys.executable, "-m", "demucs", "--two-stems=vocals", "-n", "htdemucs", "-o", str(DEMUCS_OUT), str(TRACK)],
        check=True,
    )
    shutil.copy(DEMUCS_OUT / "htdemucs" / TRACK.stem / "vocals.wav", VOCALS)
    print("->", VOCALS)


def distribute(words: list[str], start: float, end: float) -> list[dict]:
    syl = [syllables(w) for w in words]
    total, acc, res = sum(syl), 0, []
    for w, n in zip(words, syl):
        s = start + (end - start) * acc / total
        acc += n
        res.append({"w": w, "start": round(s, 2), "end": round(start + (end - start) * acc / total, 2)})
    return res


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="large-v3")
    ap.add_argument("--skip-demucs", action="store_true")
    args = ap.parse_args()

    if not args.skip_demucs:
        separate()

    import stable_whisper

    lines = parse_lyrics(LYRICS)
    model = stable_whisper.load_model(args.model)
    result = model.align(str(VOCALS), "\n".join(l["line"] for l in lines), language="uz", original_split=True)

    segs = [s for s in result.segments if s.text.strip()]
    if len(segs) != len(lines):
        sys.exit(f"Segmentlar soni ({len(segs)}) qatorlar soniga ({len(lines)}) teng emas — natijani tekshiring.")

    out = []
    for i, (ln, seg) in enumerate(zip(lines, segs), start=1):
        words = ln["line"].split()
        probs = [w.probability for w in seg.words if w.probability is not None]
        if len(seg.words) == len(words):
            wt = [{"w": w, "start": round(x.start, 2), "end": round(x.end, 2)} for w, x in zip(words, seg.words)]
        else:
            wt = distribute(words, seg.start, seg.end)
        out.append({
            "index": i,
            "singer": ln["singer"],
            "section": "",
            "line": ln["line"],
            "start": round(seg.start, 2),
            "end": round(seg.end, 2),
            "words": wt,
            "confidence": round(sum(probs) / len(probs), 2) if probs else 0.0,
        })
    write_outputs(out)


if __name__ == "__main__":
    main()
