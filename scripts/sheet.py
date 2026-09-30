"""Kadrlarni bitta varaqqa yig'adi: python scripts/sheet.py out.jpg a.png b.png ..."""
import sys
from PIL import Image, ImageDraw

out, files = sys.argv[1], sys.argv[2:]
W, H = 960, 540
cols = 2
rows = (len(files) + cols - 1) // cols
sheet = Image.new("RGB", (W * cols, H * rows), "black")
for k, f in enumerate(files):
    im = Image.open(f).convert("RGB").resize((W, H))
    ImageDraw.Draw(im).text((10, 10), f.split("/")[-1], fill="red")
    sheet.paste(im, ((k % cols) * W, (k // cols) * H))
sheet.save(out, quality=85)
