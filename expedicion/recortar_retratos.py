# Recorta los retratos de la hoja de muestra y genera los tamaños que usa la Expedición.
# Uso: python expedicion/recortar_retratos.py hoja.webp
import os, sys
from PIL import Image
ORDEN = ['ladrona', 'desertor', 'cantora', 'penitente', 'exiliado', 'novicia', 'minero', 'guardabosque', 'viuda', 'buhonero']
COLS = [(0, 222), (251, 465), (491, 706), (731, 945), (974, 1190)]
FILAS = [(23, 252), (287, 513)]
MARCO = 17   # grosor del marco dibujado en la hoja
destino = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'interfaz', 'retratos')
os.makedirs(destino, exist_ok=True)
hoja = Image.open(sys.argv[1]).convert('RGB')
muestra = Image.new('RGB', (5 * 150, 2 * 180), (20, 20, 20))
for n, nombre in enumerate(ORDEN):
    x0, x1 = COLS[n % 5]; y0, y1 = FILAS[n // 5]
    cara = hoja.crop((x0 + MARCO, y0 + MARCO, x1 - MARCO, y1 - MARCO))
    lado = min(cara.size)
    cara = cara.crop(((cara.width - lado) // 2, (cara.height - lado) // 2, (cara.width + lado) // 2, (cara.height + lado) // 2))
    grande = cara.resize((128, 128), Image.LANCZOS); grande.save(os.path.join(destino, nombre + '.png'))
    chico = cara.resize((44, 44), Image.LANCZOS); chico.save(os.path.join(destino, nombre + '_44.png'))
    # para la barra de turnos: recorte más cerrado de la cara
    m = lado // 8
    mini = cara.crop((m, 0, lado - m, lado - 2 * m)).resize((20, 20), Image.LANCZOS); mini.save(os.path.join(destino, nombre + '_20.png'))
    i, j = n % 5, n // 5
    muestra.paste(grande, (i * 150 + 6, j * 180 + 4)); muestra.paste(chico, (i * 150 + 6, j * 180 + 134)); muestra.paste(mini, (i * 150 + 60, j * 180 + 134))
muestra.save(os.path.join(destino, '..', 'muestra.png'))
