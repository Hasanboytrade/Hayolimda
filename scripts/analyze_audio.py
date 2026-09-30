"""
Trek tahlili: BPM, beat vaqtlari, energiya va bass envelope (kadrga moslangan).
Natija: src/data/audio-analysis.json

Ishga tushirish:  python scripts/analyze_audio.py [public/track.mp3]
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import librosa
import numpy as np

FPS = 30
ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "public" / "track.mp3"
OUT = ROOT / "src" / "data" / "audio-analysis.json"


def decode(path: Path, sr: int = 44100) -> np.ndarray:
    """mp3 -> mono float32 (ffmpeg orqali, imageio-ffmpeg binarisi bilan)."""
    import imageio_ffmpeg

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        subprocess.run(
            [ffmpeg, "-v", "error", "-y", "-i", str(path), "-ac", "1", "-ar", str(sr), tmp.name],
            check=True,
        )
        y, _ = librosa.load(tmp.name, sr=sr, mono=True)
    return y


def per_frame(values: np.ndarray, times: np.ndarray, n_frames: int) -> np.ndarray:
    frame_t = np.arange(n_frames) / FPS
    return np.interp(frame_t, times, values)


def normalize(v: np.ndarray) -> np.ndarray:
    lo, hi = np.percentile(v, 2), np.percentile(v, 99.5)
    return np.clip((v - lo) / max(hi - lo, 1e-9), 0, 1)


def main() -> None:
    sr = 44100
    y = decode(SRC, sr)
    duration = len(y) / sr
    n_frames = int(np.ceil(duration * FPS))
    hop = 512

    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, hop_length=hop, units="frames")
    beats = librosa.frames_to_time(beat_frames, sr=sr, hop_length=hop)

    rms = librosa.feature.rms(y=y, hop_length=hop)[0]
    t = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop)

    # Bass: 20–150 Hz mel diapazoni
    S = librosa.feature.melspectrogram(y=y, sr=sr, hop_length=hop, n_mels=64, fmax=8000)
    mel_f = librosa.mel_frequencies(n_mels=64, fmax=8000)
    bass = librosa.power_to_db(S[mel_f < 150].sum(axis=0) + 1e-10)
    bass_onset = librosa.onset.onset_strength(S=librosa.power_to_db(S[mel_f < 150]), sr=sr, hop_length=hop)

    # Visualizer uchun 16 ta chastota zonasi (log-mel)
    bands = librosa.power_to_db(S + 1e-10)
    edges = np.linspace(0, 64, 17).astype(int)
    band16 = np.stack([bands[a:b].mean(axis=0) for a, b in zip(edges[:-1], edges[1:])])

    energy = normalize(per_frame(rms, t, n_frames))
    bass_env = normalize(per_frame(bass, t, n_frames))
    bass_hit = normalize(per_frame(bass_onset, t, n_frames))
    spectrum = np.stack([normalize(per_frame(b, t, n_frames)) for b in band16], axis=1)

    # Silliq "section energy" (2 soniyalik oyna) — fon kayfiyati uchun
    k = FPS * 2
    smooth = np.convolve(energy, np.ones(k) / k, mode="same")

    data = {
        "fps": FPS,
        "duration": round(duration, 3),
        "frames": n_frames,
        "bpm": round(float(np.atleast_1d(tempo)[0]), 2),
        "beats": [round(float(b), 3) for b in beats],
        "energy": [round(float(v), 3) for v in energy],
        "energySmooth": [round(float(v), 3) for v in normalize(smooth)],
        "bass": [round(float(v), 3) for v in bass_env],
        "bassHit": [round(float(v), 3) for v in bass_hit],
        "spectrum": [[round(float(x), 2) for x in row] for row in spectrum],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, separators=(",", ":")))
    print(f"duration={duration:.2f}s frames={n_frames} bpm={data['bpm']} beats={len(beats)} -> {OUT}")


if __name__ == "__main__":
    main()
