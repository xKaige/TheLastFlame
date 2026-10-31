# Prepara una ilustración de la introducción: 1920x1080 y sin el escalonado del pixel art, para que no se pixele a pantalla completa.
# Uso: python tools/suavizar_intro.py origen destino.png
import sys
from PIL import Image, ImageFilter
im = Image.open(sys.argv[1]).convert('RGB')
w = min(im.width, round(im.height * 16 / 9)); h = round(w * 9 / 16)
x, y = (im.width - w) // 2, (im.height - h) // 2
im = im.crop((x, y, x + w, y + h)).resize((1920, 1080), Image.LANCZOS)
im = im.filter(ImageFilter.GaussianBlur(2.4)).filter(ImageFilter.UnsharpMask(radius=5, percent=110, threshold=2))
im.save(sys.argv[2], optimize=True)
