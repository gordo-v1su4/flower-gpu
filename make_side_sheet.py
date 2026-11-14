from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

folder = Path("artifacts/side")
files = sorted(folder.glob("[0-9][0-9]-*-front.png"))
font = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 20)
sheet = Image.new("RGB", (1200, 1008), "#202420")
draw = ImageDraw.Draw(sheet)
for index, path in enumerate(files):
    image = Image.open(path).convert("RGB")
    image.thumbnail((400, 300), Image.Resampling.LANCZOS)
    x = index % 3 * 400
    y = index // 3 * 336
    sheet.paste(image, (x + (400 - image.width) // 2, y + 32))
    label = path.name[3:-10].replace("-", " ").title()
    draw.text((x + 12, y + 6), label, fill="white", font=font)
output = folder / "side-contact-sheet.jpg"
sheet.save(output, quality=92, optimize=True)
print(output, output.stat().st_size)
