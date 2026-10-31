# Convierte una textura grande en un muro de 64×64 que empalma, en escala de grises.
# Uso: python tools/preparar_textura.py origen destino.png [lado_del_recorte] [brillo_maximo]
import sys
import numpy as np
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
lado = int(sys.argv[3]) if len(sys.argv) > 3 else 296
tope = float(sys.argv[4]) if len(sys.argv) > 4 else 0.96   # más bajo = menos contraste (piso, techo)
BORDE = 8   # columnas/filas extra que se funden con el lado opuesto
im = Image.open(src).convert('L')
esc = lado / 64
extra = int(BORDE * esc)
a = np.asarray(im.crop((0, 0, lado + extra, lado + extra)).resize((64 + BORDE, 64 + BORDE), Image.BOX)).astype(float)
for k in range(BORDE):                       # el sobrante entra de a poco por el lado opuesto
    t = (k + 1) / (BORDE + 1)
    a[:, k] = a[:, k] * t + a[:, 64 + k] * (1 - t)
for k in range(BORDE):
    t = (k + 1) / (BORDE + 1)
    a[k, :] = a[k, :] * t + a[64 + k, :] * (1 - t)
a = a[:64, :64]
lo, hi = np.percentile(a, 2), np.percentile(a, 99.5)
a = np.clip((a - lo) / (hi - lo), 0, 1) * (tope - 0.04) + 0.04   # el motor pone la luz: se usa todo el rango
Image.fromarray(a.astype('float32') * 255).convert('L').save(dst)
