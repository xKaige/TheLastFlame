# Quita el fondo magenta del logo y lo recorta. Uso: python tools/preparar_logo.py origen.webp
import sys
import numpy as np
from PIL import Image

a = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
# cuánto magenta tiene cada píxel: del todo fondo a del todo logo, con un borde suave entre los dos
magenta = np.minimum(r, b) - g
alfa = np.clip((170 - magenta) / 90, 0, 1)
# en el borde queda teñido de magenta: se le saca, sin tocar el naranja del fuego
exceso = np.clip(b - g, 0, None) * (alfa < 1)
sal = np.dstack([np.clip(r - exceso, 0, 255), g, np.clip(b - exceso, 0, 255), alfa * 255]).astype('uint8')
im = Image.fromarray(sal, 'RGBA')
im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 16 else 0).getbbox())
im.save('interfaz/logo.png', optimize=True)
print(im.size)
