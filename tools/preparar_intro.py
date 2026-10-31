# Prepara una ilustración de la introducción: la recorta a 16:9 sin reescalarla ni filtrarla.
# Uso: python tools/preparar_intro.py origen destino.png
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
w = min(im.width, round(im.height * 16 / 9)); h = round(w * 9 / 16)
x, y = (im.width - w) // 2, (im.height - h) // 2
im.crop((x, y, x + w, y + h)).save(sys.argv[2], optimize=True)
