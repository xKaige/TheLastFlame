# Recorta de la imagen de referencia los casilleros de la exploración.
# Uso: python tools/recortar_hud.py referencia.webp
import os, sys
from PIL import Image
ESC = 480 / 1279
destino = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'interfaz', 'hud')
os.makedirs(destino, exist_ok=True)
hoja = Image.open(sys.argv[1]).convert('RGBA')

for nombre, x0, x1 in [('pocion', 1042, 1103), ('aceite', 1108, 1170), ('antorcha', 1174, 1236)]:
    c = hoja.crop((x0, 242, x1, 299))
    c.resize((round(c.width * ESC), round(c.height * ESC)), Image.LANCZOS).save(os.path.join(destino, f'casillero_{nombre}.png'))
