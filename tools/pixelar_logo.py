# Pasa el logo a pixel art: mismo tamaño en pantalla que el resto del juego, paleta de la cripta y tramado Bayer.
# El fuego usa la paleta del fuego. Uso: python tools/pixelar_logo.py interfaz/logo_original.png interfaz/logo.png [alto]
import sys
import numpy as np
from PIL import Image

PIEDRA = ['#070d0a', '#15241b', '#2f3b2c', '#6e5640', '#b98c66', '#efc79a']
FUEGO = ['#3a0d06', '#7c1f0a', '#c9440c', '#ee7d1a', '#fab634', '#ffeeb0']
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16
rgb = lambda l: np.array([[int(c[i:i + 2], 16) for i in (1, 3, 5)] for c in l], dtype=float)

alto = int(sys.argv[3]) if len(sys.argv) > 3 else 126
im = Image.open(sys.argv[1]).convert('RGBA')
im = im.resize((round(im.width * alto / im.height), alto), Image.LANCZOS)
a = np.asarray(im).astype(float)
r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
lum = (r * 0.35 + g * 0.5 + b * 0.15) / 255
lum = np.clip(lum / np.percentile(lum[al > 128], 99), 0, 1) ** 0.85

alto_px, ancho = lum.shape
umbral = BAYER[np.indices(lum.shape)[0] % 4, np.indices(lum.shape)[1] % 4]
fuego = (r > 140) & (b < r * 0.58) & (g > r * 0.25)
v = lum * 5
k = np.clip(np.floor(v + (v - np.floor(v) > umbral) * 1).astype(int), 0, 5)
sal = np.zeros(a.shape, 'uint8')
sal[..., :3] = np.where(fuego[..., None], rgb(FUEGO)[k], rgb(PIEDRA)[k]).astype('uint8')
lleno = al > 128
# un borde oscuro de un píxel, para que se despegue del fondo como los sprites
borde = np.zeros(lleno.shape, bool)
for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
    borde |= np.roll(lleno, (dy, dx), (0, 1))
borde &= ~lleno
sal[borde] = (7, 13, 10, 255)
sal[..., 3] = (lleno | borde) * 255
Image.fromarray(sal, 'RGBA').save(sys.argv[2], optimize=True)
print(ancho, alto_px)
