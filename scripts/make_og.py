"""Render website/og.png — the 1200×630 social preview card.

Matches the dashboard's signage system: off-white ground, black rule,
condensed caps, regulation green sign for the headline figure.
Run from the project root. Requires Pillow.
"""
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
INK = "#12181b"
NOTE = "#4a5f66"
GROUND = "#f2f4f3"
GREEN = "#0a6b3d"
SIGN_INK = "#ffffff"
SIGN_NOTE = "#eaf3ee"
HAIR = "#d7dedc"

FONT_DIR = r"C:\Windows\Fonts"


def font(name, size):
    return ImageFont.truetype(f"{FONT_DIR}\\{name}", size)


narrow = font("ARIALNB.TTF", 92)
narrow_sign = font("ARIALNB.TTF", 104)
narrow_stat = font("ARIALNB.TTF", 34)
mono_b = font("consolab.ttf", 19)
mono = font("consola.ttf", 17)
sans_small = font("segoeui.ttf", 16)

img = Image.new("RGB", (W, H), GROUND)
d = ImageDraw.Draw(img)

d.rectangle([0, 0, W, 10], fill=INK)


def tracked(draw, xy, text, fnt, fill, tracking=0):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += draw.textlength(ch, font=fnt) + tracking
    return x


tracked(d, (64, 40), "NYC OPEN DATA  ·  HPD AFFORDABLE HOUSING  ·  DOT PARKING METERS",
        mono_b, NOTE, 1.2)

d.text((62, 92), "AFFORDABLE HOUSING", font=narrow, fill=INK)
d.text((62, 176), "& CURBSIDE ACCESS", font=narrow, fill=INK)

# sign
sx, sy, sw, sh = 64, 330, 470, 206
d.rectangle([sx, sy, sx + sw, sy + sh], fill=GREEN, outline=INK, width=4)
d.text((sx + 26, sy + 6), "75.7%", font=narrow_sign, fill=SIGN_INK)
cap = [
    "of housing records with usable",
    "coordinates have an active meter",
    "within a 7 × 7 grid window",
]
for i, line in enumerate(cap):
    d.text((sx + 28, sy + 130 + i * 22), line, font=sans_small, fill=SIGN_NOTE)

# stats, stacked beside the sign
stats = [
    ("9,551", "HOUSING RECORDS"),
    ("15,592", "PARKING METERS"),
    ("81 : 13", "QUEENS : BRONX PER 1,000 UNITS"),
]
x, y = 596, 344
for value, label in stats:
    d.rectangle([x, y, x + 3, y + 52], fill=INK)
    d.text((x + 16, y - 2), value, font=narrow_stat, fill=INK)
    tracked(d, (x + 16, y + 32), label, mono, NOTE, 0.8)
    y += 68

d.rectangle([0, 578, W, 579], fill=HAIR)
d.text((64, 592), "abdelrahmanahmed-16001205.github.io/Data-eng-proj", font=mono, fill=NOTE)
right = "12 VIEWS"
d.text((W - 64 - d.textlength(right, font=mono_b), 592), right, font=mono_b, fill=GREEN)

img.save("website/og.png", optimize=True)
print("wrote website/og.png", img.size)
