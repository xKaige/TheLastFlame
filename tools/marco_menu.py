# Dibuja el marco de piedra y hierro de los menús, para usarlo con border-image (se corta en 6 píxeles por lado).
# Uso: python tools/marco_menu.py destino.png
import sys, random
from PIL import Image
random.seed(7)
L, B = 18, 6
PIEDRA = [(38, 44, 36), (54, 62, 50), (78, 86, 70), (104, 110, 90)]
HIERRO = [(20, 18, 16), (66, 52, 40), (112, 80, 52), (154, 112, 70)]
im = Image.new('RGBA', (L, L), (0, 0, 0, 0))
px = im.load()
def lado(x, y):
    # borde exterior negro, piedra con luz arriba y a la izquierda, y línea oscura adentro
    d = min(x, y, L - 1 - x, L - 1 - y)
    if d >= B: return None
    if d == 0 or d == B - 1: return (6, 7, 6, 255)
    luz = 3 if d == 1 and (x < y and x < L - 1 - y or y < x and y < L - 1 - x) else 2 if d == 1 else 1 if d == 2 else 0
    if random.random() < 0.28: luz = max(0, luz - 1)
    return (*PIEDRA[luz], 255)
for y in range(L):
    for x in range(L):
        c = lado(x, y)
        if c: px[x, y] = c
# herrajes en las cuatro esquinas: una chapa remachada
CHAPA = ['011110', '123331', '132221', '132021', '132211', '111100']
for cy, sy in ((0, 1), (L - 1, -1)):
    for cx, sx in ((0, 1), (L - 1, -1)):
        for j, fila in enumerate(CHAPA):
            for i, v in enumerate(fila):
                if i + j < 9: px[cx + sx * i, cy + sy * j] = (*HIERRO[int(v)], 255)
im.save(sys.argv[1])
