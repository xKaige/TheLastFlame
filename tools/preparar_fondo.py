# Convierte una escena en fondo del juego: brillo en gris, sin deformar, centrada en 480×270 sobre negro.
# El lienzo queda de 480×480 porque el motor trabaja con sprites cuadrados: abajo sobra y es transparente.
# Uso: python tools/preparar_fondo.py origen destino.png
import sys
import numpy as np
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
esc = min(480 / im.width, 270 / im.height)
chico = im.resize((round(im.width * esc), round(im.height * esc)), Image.LANCZOS)
a = np.asarray(chico).astype(float)
g = a[..., 0] * 0.35 + a[..., 1] * 0.5 + a[..., 2] * 0.15
bajo, alto = np.percentile(g, 2), np.percentile(g, 99.5)
g = np.clip((g - bajo) / (alto - bajo), 0, 1) * 255            # usa todo el rango de brillo
lienzo = np.zeros((480, 480, 4), 'uint8')
lienzo[:270, :, 3] = 255
x, y = (480 - chico.width) // 2, (270 - chico.height) // 2
for k in range(3): lienzo[y:y + chico.height, x:x + chico.width, k] = g.astype('uint8')
Image.fromarray(lienzo, 'RGBA').save(dst)
print(im.size, '->', chico.size, 'en', (x, y))
