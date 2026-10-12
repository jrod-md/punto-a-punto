from pathlib import Path
from PIL import Image, ImageDraw

target = Path(__file__).resolve().parents[1] / "public" / "icons"
target.mkdir(parents=True, exist_ok=True)
for name, size, maskable in [("icon-192.png", 192, False), ("icon-512.png", 512, False), ("icon-maskable.png", 512, True), ("apple-touch-icon.png", 180, False)]:
    scale = size * 4 / 128
    image = Image.new("RGB", (size * 4, size * 4), "#3f573b")
    draw = ImageDraw.Draw(image)
    inset = 8 if maskable else 0
    for row in [36, 60, 84]:
        points = [(32, row), (48, row + 16), (64, row), (80, row + 16), (96, row)]
        points = [((x * (1 - inset / 64) + inset) * scale, (y * (1 - inset / 64) + inset) * scale) for x, y in points]
        draw.line(points, fill="#fff8e7", width=round(8 * scale), joint="curve")
        for x, y in points:
            radius = 4 * scale
            draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill="#fff8e7")
    image.resize((size, size), Image.Resampling.LANCZOS).save(target / name)
