"""
Modelsiz vokal ajratish (demucs o'rniga zaxira usul).

1) Mid/side: vokal odatda markazda -> mid kanal.
2) REPET-SIM (librosa.decompose.nn_filter): takrorlanuvchi (instrumental) fonni
   o'xshash kadrlar medianasi orqali baholab, soft-mask bilan ajratish.
3) 150 Hz dan past va 8 kHz dan yuqori chastotalar kesiladi.

Natija: analysis/vocals.wav (22.05 kHz mono)
Demucs mavjud bo'lsa, uning vocals.wav faylini shu joyga qo'yish kifoya.
"""
import subprocess
import tempfile
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "track.mp3"
OUT = ROOT / "analysis" / "vocals.wav"
SR = 22050


def load_stereo() -> np.ndarray:
    import imageio_ffmpeg

    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        subprocess.run(
            [imageio_ffmpeg.get_ffmpeg_exe(), "-v", "error", "-y", "-i", str(SRC), "-ar", str(SR), tmp.name],
            check=True,
        )
        y, _ = librosa.load(tmp.name, sr=SR, mono=False)
    return y


def main() -> None:
    y = load_stereo()
    mid = y.mean(axis=0) if y.ndim == 2 else y
    D = librosa.stft(mid, n_fft=2048, hop_length=512)
    mag, phase = np.abs(D), np.angle(D)

    # REPET-SIM: ~2 soniya oraliqdagi o'xshash kadrlar medianasi = fon
    bg = librosa.decompose.nn_filter(
        mag, aggregate=np.median, metric="cosine",
        width=int(librosa.time_to_frames(2, sr=SR, hop_length=512)),
    )
    bg = np.minimum(mag, bg)
    margin, power = 2, 2
    mask_v = librosa.util.softmask(mag - bg, margin * bg, power=power)

    freqs = librosa.fft_frequencies(sr=SR, n_fft=2048)
    band = ((freqs > 150) & (freqs < 8000)).astype(float)[:, None]
    V = mask_v * mag * band * np.exp(1j * phase)
    vocals = librosa.istft(V, hop_length=512, length=len(mid))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    sf.write(OUT, vocals / (np.abs(vocals).max() + 1e-9) * 0.9, SR)
    print("->", OUT)


if __name__ == "__main__":
    main()
