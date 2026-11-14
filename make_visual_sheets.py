from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

folder = Path("artifacts/visuals")
names = [
    "VelvetDahlia", "SoftPeony", "WildOrchid", "GardenChrysanthemum",
    "SunburstDahlia", "StoneRosette", "StargazerLily", "PassionFlower", "CopperRose",
]
font = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 20)
for view, suffix in [("three-quarter", "three-quarter"), ("top", "top")]:
    sheet = Image.new("RGB", (1200, 1008), "#202420")
    draw = ImageDraw.Draw(sheet)
    for index, name in enumerate(names):
        path = folder / f"{index + 1:02d}-{name}-{suffix}.png"
        image = Image.open(path).convert("RGB")
        image.thumbnail((400, 300), Image.Resampling.LANCZOS)
        x = index % 3 * 400
        y = index // 3 * 336
        sheet.paste(image, (x + (400 - image.width) // 2, y + 32))
        label = name.replace("GardenChrysanthemum", "Garden Chrysanthemum")
        label = "".join(f" {char}" if char.isupper() and i else char for i, char in enumerate(label))
        draw.text((x + 12, y + 6), label, fill="white", font=font)
    output = folder / f"sheet-{view}.jpg"
    sheet.save(output, quality=90, optimize=True)
    print(output, output.stat().st_size)
