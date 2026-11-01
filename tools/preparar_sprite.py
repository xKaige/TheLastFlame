# Quita el fondo magenta de un dibujo y lo deja cuadrado, apoyado en el borde de abajo.
# Uso: python tools/preparar_sprite.py origen destino.png [lado]
import sys
import numpy as np
from PIL import Image

lado = int(sys.argv[3]) if len(sys.argv) > 3 else 128
a = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
alfa = np.clip((170 - (np.minimum(r, b) - g)) / 90, 0, 1)
exceso = np.clip(b - g, 0, None) * (alfa < 1)
sal = np.dstack([np.clip(r - exceso, 0, 255), g, np.clip(b - exceso, 0, 255), alfa * 255]).astype('uint8')
im = Image.fromarray(sal, 'RGBA')
im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 16 else 0).getbbox())
k = lado / max(im.size)
im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
fondo = Image.new('RGBA', (lado, lado), (0, 0, 0, 0))
fondo.alpha_composite(im, ((lado - im.width) // 2, lado - im.height))
fondo.save(sys.argv[2], optimize=True)
print(sys.argv[2], im.size)
