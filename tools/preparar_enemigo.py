# Convierte un dibujo con fondo magenta en un sprite de enemigo: sin fondo, recortado y con los pies abajo.
# Uso: python tools/preparar_enemigo.py origen destino.png [lado] [alto_colgante]
# Con alto_colgante el dibujo queda arriba del lienzo, a esa altura: es un accesorio que cuelga del techo.
import sys
import numpy as np
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
lado = int(sys.argv[3]) if len(sys.argv) > 3 else 110
colgante = int(sys.argv[4]) if len(sys.argv) > 4 else 0
a = np.asarray(Image.open(src).convert('RGB')).astype(int)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
fondo = (r - g > 70) & (b - g > 70)                   # magenta y sus bordes por la compresión
alfa = np.where(fondo, 0, 255).astype('uint8')
# el borde suele quedar teñido de rosa: se quita el verde faltante
rosa = (r - g > 25) & (b - g > 25) & ~fondo
a[rosa] = np.stack([g[rosa] + 10, g[rosa], g[rosa] + 5], axis=1)
rgba = np.dstack([a.astype('uint8'), alfa])
ys, xs = np.where(alfa > 0)
im = Image.fromarray(rgba, 'RGBA').crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
esc = colgante / im.height if colgante else lado / max(im.size)   # siempre la misma escala en los dos ejes
chico = im.resize((max(1, round(im.width * esc)), max(1, round(im.height * esc))), Image.LANCZOS)
c = np.asarray(chico).copy(); c[..., 3] = np.where(c[..., 3] > 128, 255, 0)     # borde nítido, sin semitransparencias
chico = Image.fromarray(c, 'RGBA')
lienzo = Image.new('RGBA', (lado, lado), (0, 0, 0, 0))
lienzo.paste(chico, ((lado - chico.width) // 2, 0 if colgante else lado - chico.height), chico)
lienzo.save(dst)
print(im.size, '->', chico.size)
