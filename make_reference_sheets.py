from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path("references")
groups = [
    [("Rose", "01"), ("Rose", "26"), ("Rose", "123"), ("Peony", "61"), ("Peony", "187"), ("Orchid", "144"), ("Orchid", "181"), ("Orchid", "221")],
    [("Chrysanthemum", "09"), ("Chrysanthemum", "11"), ("Chrysanthemum", "63"), ("Lily", "97"), ("Lily", "109"), ("Rosette", "03"), ("Dahlia", "15")],
]
font = ImageFont.load_default(size=22)
for sheet_index, entries in enumerate(groups, 1):
    sheet = Image.new("RGB", (1440, 800), "#171b19")
    draw = ImageDraw.Draw(sheet)
    for index, (species, stem) in enumerate(entries):
        image = Image.open(root / f"flower_{stem}.png").convert("RGB")
        image.thumbnail((340, 340))
        x = (index % 4) * 360 + (360 - image.width) // 2
        y = (index // 4) * 400 + 38 + (340 - image.height) // 2
        sheet.paste(image, (x, y))
        draw.text(((index % 4) * 360 + 16, (index // 4) * 400 + 10), f"{species} · {stem}", fill="#f2eee8", font=font)
    sheet.save(root / f"sheet-{sheet_index}.jpg", quality=88, optimize=True)
