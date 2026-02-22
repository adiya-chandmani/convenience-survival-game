"""Generate simple pixel-art sprites for mvp_game.

Outputs to public/sprites/{projectiles,effects,weapons}.

Requires: pillow
  pip3 install pillow

Usage:
  python3 tools/generate_pixel_sprites.py
"""

from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / 'public' / 'sprites'
(OUT / 'projectiles').mkdir(parents=True, exist_ok=True)
(OUT / 'effects').mkdir(parents=True, exist_ok=True)
(OUT / 'weapons').mkdir(parents=True, exist_ok=True)

C_BG = (0, 0, 0, 0)
C_OUT = (10, 14, 18, 255)
C_W = (232, 238, 247, 255)
C_CYAN = (154, 209, 255, 255)
C_CYAN2 = (76, 200, 255, 255)
C_MAG = (255, 79, 216, 255)
C_TEAL = (46, 230, 166, 255)
C_YEL = (255, 200, 87, 255)
C_GOLD = (255, 221, 136, 255)
C_GREY = (160, 170, 184, 255)
C_GREY2 = (110, 122, 144, 255)


def save(img: Image.Image, rel: str):
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)
    print('wrote', path)


def new(size=(32, 32)):
    return Image.new('RGBA', size, C_BG)


def outline_rect(draw: ImageDraw.ImageDraw, xy, fill, outline=C_OUT):
    x0, y0, x1, y1 = xy
    draw.rectangle([x0, y0, x1, y1], fill=outline)
    draw.rectangle([x0 + 1, y0 + 1, x1 - 1, y1 - 1], fill=fill)


def outline_circle(draw: ImageDraw.ImageDraw, cx, cy, r, fill, outline=C_OUT):
    draw.ellipse([cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1], fill=outline)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill)


def coffee_can():
    img = new()
    d = ImageDraw.Draw(img)
    outline_rect(d, (11, 7, 20, 24), fill=C_GREY)
    d.rectangle([12, 8, 19, 9], fill=C_W)
    d.rectangle([12, 13, 19, 14], fill=C_CYAN)
    d.rectangle([12, 16, 19, 16], fill=C_CYAN2)
    d.rectangle([13, 10, 13, 23], fill=(255, 255, 255, 90))
    save(img, 'projectiles/coffee_can_shot.png')


def staple():
    img = new()
    d = ImageDraw.Draw(img)
    ox, oy = 11, 12
    d.rectangle([ox, oy, ox + 10, oy + 8], fill=C_OUT)
    d.rectangle([ox + 1, oy + 1, ox + 9, oy + 7], fill=C_BG)
    d.rectangle([ox + 1, oy + 5, ox + 3, oy + 7], fill=C_GOLD)
    d.rectangle([ox + 7, oy + 5, ox + 9, oy + 7], fill=C_GOLD)
    d.rectangle([ox + 1, oy + 1, ox + 9, oy + 3], fill=C_GOLD)
    d.point((ox + 2, oy + 2), fill=C_W)
    save(img, 'projectiles/staple.png')


def coin():
    img = new()
    d = ImageDraw.Draw(img)
    outline_circle(d, 16, 16, 7, fill=C_GOLD)
    d.ellipse([12, 12, 20, 20], outline=C_YEL)
    d.point((14, 13), fill=C_W)
    d.point((13, 14), fill=C_W)
    save(img, 'projectiles/coin.png')


def receipt_blade():
    img = new()
    d = ImageDraw.Draw(img)
    poly = [(9, 20), (12, 9), (15, 7), (23, 13), (22, 16), (14, 23)]
    d.polygon(poly, fill=C_OUT)
    inner = [(10, 20), (13, 10), (15, 9), (21, 13), (20, 15), (14, 21)]
    d.polygon(inner, fill=C_W)
    d.line([(12, 11), (20, 15)], fill=C_CYAN, width=1)
    save(img, 'weapons/receipt_blade.png')


def mop_head():
    img = new()
    d = ImageDraw.Draw(img)
    d.rectangle([15, 8, 16, 14], fill=C_OUT)
    d.rectangle([15, 9, 16, 13], fill=C_GREY)
    outline_rect(d, (9, 14, 22, 23), fill=C_TEAL)
    for x in range(10, 22, 2):
        d.line([(x, 22), (x, 24)], fill=C_TEAL)
        d.point((x, 24), fill=C_OUT)
    d.point((24, 18), fill=C_CYAN)
    d.point((25, 19), fill=C_CYAN)
    save(img, 'weapons/mop_spin.png')


def boxcutter():
    img = new()
    d = ImageDraw.Draw(img)
    poly = [(9, 20), (14, 9), (18, 9), (23, 20), (20, 23), (12, 23)]
    d.polygon(poly, fill=C_OUT)
    inner = [(11, 20), (15, 11), (18, 11), (21, 20), (19, 21), (13, 21)]
    d.polygon(inner, fill=C_GREY)
    d.polygon([(18, 11), (20, 15), (18, 16), (16, 12)], fill=C_CYAN)
    save(img, 'weapons/boxcutter_boomerang.png')


def beam(rel: str, h: int, stripe: bool = False):
    img = Image.new('RGBA', (32, h), C_BG)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 31, h - 1], fill=C_OUT)
    d.rectangle([1, 1, 30, h - 2], fill=C_CYAN)
    d.rectangle([4, max(2, h // 2 - 1), 27, min(h - 3, h // 2 + 1)], fill=C_W)
    if stripe:
        for x in range(2, 30, 4):
            d.rectangle([x, 1, x + 1, h - 2], fill=(0, 0, 0, 60))
    save(img, rel)


def puddle_green():
    img = new()
    d = ImageDraw.Draw(img)
    poly = [(8, 20), (10, 14), (16, 11), (22, 14), (24, 20), (20, 24), (12, 24)]
    d.polygon(poly, fill=C_OUT)
    inner = [(9, 20), (11, 15), (16, 12), (21, 15), (23, 20), (19, 23), (13, 23)]
    d.polygon(inner, fill=C_TEAL)
    d.point((14, 16), fill=C_W)
    d.point((18, 18), fill=C_W)
    save(img, 'effects/detergent_puddle.png')


def price_tag_bomb():
    img = new()
    d = ImageDraw.Draw(img)
    poly = [(10, 10), (22, 10), (24, 12), (24, 20), (22, 22), (10, 22), (8, 20), (8, 12)]
    d.polygon(poly, fill=C_OUT)
    inner = [(11, 11), (22, 11), (23, 12), (23, 20), (22, 21), (11, 21), (9, 20), (9, 12)]
    d.polygon(inner, fill=C_YEL)
    outline_circle(d, 12, 14, 2, fill=(0, 0, 0, 0))
    d.line([(22, 10), (26, 6)], fill=C_OUT, width=1)
    d.point((26, 6), fill=C_MAG)
    d.point((25, 6), fill=C_YEL)
    save(img, 'weapons/price_tag_bomb.png')


def icy_ring():
    img = new()
    d = ImageDraw.Draw(img)
    outline_circle(d, 16, 16, 11, fill=(0, 0, 0, 0))
    d.ellipse([6, 6, 26, 26], outline=C_CYAN)
    for p in [(8, 10), (24, 12), (10, 24), (22, 22)]:
        d.point(p, fill=C_W)
        d.point((p[0] + 1, p[1]), fill=C_CYAN)
    save(img, 'effects/ice_slow_ring.png')


def coupon():
    img = new()
    d = ImageDraw.Draw(img)
    outline_rect(d, (9, 11, 22, 20), fill=C_W)
    d.rectangle([10, 12, 21, 12], fill=C_MAG)
    d.rectangle([10, 19, 21, 19], fill=C_MAG)
    for x in range(12, 21, 3):
        d.point((x, 16), fill=C_GREY2)
    save(img, 'effects/coupon.png')


def steam_puff():
    img = new()
    d = ImageDraw.Draw(img)
    outline_circle(d, 14, 18, 6, fill=(220, 225, 235, 255))
    outline_circle(d, 19, 14, 5, fill=(220, 225, 235, 255))
    outline_circle(d, 12, 12, 4, fill=(220, 225, 235, 255))
    d.point((22, 10), fill=(220, 225, 235, 140))
    d.point((23, 9), fill=(220, 225, 235, 90))
    save(img, 'effects/steam_puff.png')


def main():
    coffee_can()
    staple()
    coin()
    receipt_blade()
    mop_head()
    boxcutter()
    beam('effects/barcode_beam_strip.png', 8, stripe=True)
    beam('effects/receipt_printer_beam_strip.png', 10, stripe=False)
    puddle_green()
    price_tag_bomb()
    icy_ring()
    coupon()
    steam_puff()


if __name__ == '__main__':
    main()
