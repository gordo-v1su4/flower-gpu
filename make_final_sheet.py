from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

folder = Path("artifacts/final")
names = [
    "VelvetDahlia", "SoftPeony", "WildOrchid", "GardenChrysanthemum",
    "SunburstDahlia", "StoneRosette", "StargazerLily", "PassionFlower", "CopperRose",
]
font = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 20)
sheet = Image.new("RGB", (1200, 1008), "#202420")
draw = ImageDraw.Draw(sheet)
for index, name in enumerate(names):
    image = Image.open(folder / f"{index + 1:02d}-{name}.png").convert("RGB")
    image.thumbnail((400, 300), Image.Resampling.LANCZOS)
    x = index % 3 * 400
    y = index // 3 * 336
    sheet.paste(image, (x + (400 - image.width) // 2, y + 32))
    label = "".join(f" {char}" if char.isupper() and i else char for i, char in enumerate(name))
    draw.text((x + 12, y + 6), label, fill="white", font=font)
output = folder / "final-contact-sheet.jpg"
sheet.save(output, quality=92, optimize=True)
print(output, output.stat().st_size)
