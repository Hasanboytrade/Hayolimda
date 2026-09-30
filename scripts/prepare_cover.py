"""
Fon uchun cover'ning kuchli blur qilingan versiyasini tayyorlaydi (public/cover-blur.jpg).
Blur'ni oldindan qilish har kadrda CSS filter: blur(60px) hisoblashdan ancha tez render beradi.

Ishga tushirish:  python scripts/prepare_cover.py [public/cover.jpg]
"""
import sys
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "public" / "cover.jpg"
OUT = ROOT / "public" / "cover-blur.jpg"

img = Image.open(SRC).convert("RGB").resize((1024, 1024), Image.LANCZOS)
img = img.filter(ImageFilter.GaussianBlur(28))
img = ImageEnhance.Color(img).enhance(1.1)
img.save(OUT, quality=92)
print("->", OUT)
