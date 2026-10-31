# Pasa una imagen por el estilo del juego: 480×270, gris, 6 tonos de la paleta y dithering Bayer 4×4.
# Uso: python tools/pasar_a_paleta.py origen destino.png [paleta]
import sys
import numpy as np
from PIL import Image

PALETAS = {
    'crypt': ['#070d0a', '#15241b', '#2f3b2c', '#6e5640', '#b98c66', '#efc79a'],
    'castle': ['#07050c', '#22122e', '#4f2148', '#933a45', '#d9753f', '#f5c98a'],
    'engrave': ['#000000', '#121212', '#383836', '#77756f', '#c8c5bb', '#f2efe6'],
}
BAYER = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) + 0.5) / 16


def a_paleta(gris, paleta):
    """gris: valores 0..1 → imagen RGB con los 6 tonos, tramados."""
    pal = np.array([[int(h[i:i + 2], 16) for i in (1, 3, 5)] for h in PALETAS[paleta]], dtype='uint8')
    alto, ancho = gris.shape
    trama = np.tile(BAYER, (alto // 4 + 1, ancho // 4 + 1))[:alto, :ancho]
    v = np.clip(gris, 0, 1) * (len(pal) - 1)
    k = np.floor(v).astype(int)
    k = np.clip(k + ((v - k) > trama), 0, len(pal) - 1)
    return pal[k]


def preparar_fondo(ruta):
    im = Image.open(ruta).convert('L')
    alto = round(im.width * 9 / 16)
    if alto <= im.height:
        arriba = (im.height - alto) // 2
        im = im.crop((0, arriba, im.width, arriba + alto))
    a = np.asarray(im.resize((480, 270), Image.BOX)).astype(float) / 255
    lo, hi = np.percentile(a, 1), np.percentile(a, 99.7)
    return np.clip((a - lo) / (hi - lo), 0, 1) ** 0.8    # abre las sombras para que la trama se vea


if __name__ == '__main__':
    paleta = sys.argv[3] if len(sys.argv) > 3 else 'crypt'
    Image.fromarray(a_paleta(preparar_fondo(sys.argv[1]), paleta), 'RGB').save(sys.argv[2])
