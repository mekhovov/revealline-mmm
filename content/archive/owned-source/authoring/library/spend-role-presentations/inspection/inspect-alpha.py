"""Read-only PNG/alpha inspection. Never writes or transforms image pixels."""
from pathlib import Path
from PIL import Image
import hashlib
import json
import sys

BASE = Path(__file__).resolve().parent.parent
ROLES = ('scout', 'bomber', 'carrier', 'interceptor', 'fiber', 'impact', 'trapper')
rows = []
for role in ROLES:
    record = json.loads((BASE / 'provenance' / f'{role}.json').read_text())
    path = BASE / record['original']['path']
    raw = path.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == record['original']['sha256']
    with Image.open(path) as image:
        image.load()
        assert image.mode == 'RGBA'
        width, height = image.size
        alpha = image.getchannel('A')
        histogram = alpha.histogram()
        bounds = alpha.getbbox()
        substantial = alpha.point(lambda a: 255 if a >= 128 else 0).getbbox()
        assert substantial is not None
        left, top, right, bottom = substantial
        colors = image.getcolors(maxcolors=width * height)
        visible_colors = sum(1 for _, rgba in colors if rgba[3] >= 128)
        rows.append({
            'role': role, 'width': width, 'height': height, 'mode': image.mode,
            'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
            'alpha0Pixels': histogram[0], 'alpha255Pixels': histogram[255],
            'intermediateAlphaPixels': sum(histogram[1:255]),
            'allNonzeroAlphaBoundsExclusive': bounds,
            'alphaAtLeast128BoundsExclusive': substantial,
            'substantialWidthFraction': (right - left) / width,
            'substantialHeightFraction': (bottom - top) / height,
            'substantialMarginsPixels': [left, top, width - right, height - bottom],
            'substantialTouchesFrame': left == 0 or top == 0 or right == width or bottom == height,
            'distinctRGBAColors': len(colors), 'distinctRGBAAtAlpha128': visible_colors,
            'nonzeroAlphaMode': max(range(1, 256), key=lambda a: histogram[a]),
            'alphaAtLeast250Pixels': sum(histogram[250:]),
            'lowNonzeroAlphaPixels': sum(histogram[1:128]),
            'alphaHistogram': histogram,
            'strictPaletteLimitClaimed': False,
        })
result = {'format': 'spend-role-alpha-inspection.v1', 'method': 'Pillow read-only full decode, RGBA alpha histogram and pixel bounds; no image save, resizing, cropping, palette conversion or editing.', 'rows': rows, 'originalBytes': sum(row['bytes'] for row in rows), 'qualification': 'Alpha threshold measurements are not perceptual readability, collider bounds, pivots or rig validation. Low-alpha edge fringes remain in exact originals.'}
target = Path(sys.argv[1])
with target.open('x') as output:
    json.dump(result, output, indent=2)
    output.write('\n')
print(json.dumps({'roles': len(rows), 'originalBytes': result['originalBytes'], 'anySubstantialTouchesFrame': any(row['substantialTouchesFrame'] for row in rows), 'rows': [{key: row[key] for key in ('role', 'alpha0Pixels', 'alphaAtLeast128BoundsExclusive', 'distinctRGBAAtAlpha128')} for row in rows]}))
