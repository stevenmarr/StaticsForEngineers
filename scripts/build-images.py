#!/usr/bin/env python3
"""Build the farm photos used by the app (dev-only; needs Pillow).

Reads originals from ../goat-photos (or SRC_DIR), fixes orientation, resizes,
and writes WebP + JPG variants to public/img/farm/. Nothing from the original
files' metadata (EXIF, GPS, camera info, ICC) is copied into the outputs.
"""
import os, sys, json
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.environ.get('SRC_DIR', os.path.join(os.path.dirname(ROOT), 'goat-photos'))
OUT = os.path.join(ROOT, 'public', 'img', 'farm')
os.makedirs(OUT, exist_ok=True)

PHOTOS = {
    # name: (source file, list of long-edge sizes)
    'goat-talk': ('1-boy-with-kid-goat-caption.jpg', [1600, 960, 480]),
    'nubian-brown': ('2-brown-nubian-horns.jpg', [1600, 960, 480]),
    'white-grazing': ('3-white-goat-grazing.jpg', [1600, 960, 480]),
    'black-kid': ('4-black-kid-closeup.jpg', [1280, 960, 480]),
    'two-kids': ('5-two-kids-pen.jpg', [1600, 960, 480]),
    'white-profile': ('6-white-goat-horns-profile.jpg', [1600, 960, 480]),
}
# Square character portraits: (source, centre x, centre y, side) as fractions of width/height/short side.
AVATARS = {
    'avatar-clove': ('2-brown-nubian-horns.jpg', 0.52, 0.42, 0.42),
    'avatar-captain': ('6-white-goat-horns-profile.jpg', 0.80, 0.56, 0.46),
    'avatar-pepper': ('4-black-kid-closeup.jpg', 0.35, 0.43, 0.56),
    'avatar-twins': ('5-two-kids-pen.jpg', 0.68, 0.27, 0.54),
    'avatar-juniper': ('3-white-goat-grazing.jpg', 0.62, 0.42, 0.40),
}
# Wide banners: (source, top fraction, bottom fraction) of the oriented image, full width.
BANNERS = {
    'banner-grazing': ('3-white-goat-grazing.jpg', 0.40, 0.66),
    'banner-twins': ('5-two-kids-pen.jpg', 0.05, 0.62),
}

def load(name):
    im = Image.open(os.path.join(SRC, name))
    im = ImageOps.exif_transpose(im).convert('RGB')  # bake orientation, drop alpha/profile
    clean = Image.new('RGB', im.size)
    clean.paste(im)  # a brand-new image carries no metadata at all
    return clean

def save(im, base):
    im.save(os.path.join(OUT, base + '.webp'), 'WEBP', quality=78, method=6)
    im.save(os.path.join(OUT, base + '.jpg'), 'JPEG', quality=80, optimize=True, progressive=True)

manifest = {}
for name, (src, sizes) in PHOTOS.items():
    im = load(src)
    manifest[name] = {'w': [], 'ratio': round(im.width / im.height, 4)}
    for s in sizes:
        r = s / max(im.size)
        v = im.resize((round(im.width * r), round(im.height * r)), Image.LANCZOS) if r < 1 else im
        save(v, f'{name}-{v.width}')
        manifest[name]['w'].append(v.width)
for name, (src, cx, cy, side) in AVATARS.items():
    im = load(src)
    s = int(min(im.size) * side)
    x0 = min(max(0, int(im.width * cx - s / 2)), im.width - s)
    y0 = min(max(0, int(im.height * cy - s / 2)), im.height - s)
    crop = im.crop((x0, y0, x0 + s, y0 + s))
    manifest[name] = {'w': [], 'ratio': 1}
    for px in (320, 160):
        save(crop.resize((px, px), Image.LANCZOS), f'{name}-{px}')
        manifest[name]['w'].append(px)
for name, (src, t, b) in BANNERS.items():
    im = load(src)
    crop = im.crop((0, int(im.height * t), im.width, int(im.height * b)))
    manifest[name] = {'w': [], 'ratio': round(crop.width / crop.height, 4)}
    for w in (1600, 800):
        r = w / crop.width
        save(crop.resize((w, round(crop.height * r)), Image.LANCZOS), f'{name}-{w}')
        manifest[name]['w'].append(w)
with open(os.path.join(OUT, 'manifest.json'), 'w') as f:
    json.dump(manifest, f, indent=1)
print('wrote', len(os.listdir(OUT)), 'files to', OUT)
