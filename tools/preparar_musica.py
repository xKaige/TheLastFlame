# Convierte un tema en música de juego con repetición continua: busca dos puntos parecidos, empalma el final
# sobre el principio con un fundido y guarda un OGG. Lo que hay antes del bucle suena una sola vez, como intro.
# Uso: python tools/preparar_musica.py origen destino.ogg [bpm]
import subprocess, sys
import numpy as np
src, dst = sys.argv[1], sys.argv[2]
bpm = float(sys.argv[3]) if len(sys.argv) > 3 else 150
SR, FUNDIDO = 48000, 1.2


def leer(sr, canales):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-map', '0:a', '-ac', str(canales), '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, 'float32').reshape(-1, canales)


sr = 4000
m = leer(sr, 1)[:, 0]
dur = len(m) / sr
compas = 4 * 60 / bpm
w = int(sr * compas * 2)                      # compara dos compases
mejor = (-1, 0, 0)
for fin in np.arange(dur - 30, dur - 6, compas / 8):
    b = m[int(fin * sr) - w:int(fin * sr)]
    b = (b - b.mean()) / (b.std() + 1e-9)
    # busca dentro de los primeros 40 segundos, sin contar el arranque
    zona = m[int(4 * sr):int(40 * sr)]
    c = np.correlate(zona, b, 'valid')
    cs = np.cumsum(np.r_[0, zona ** 2]); en = np.sqrt(np.maximum(cs[w:] - cs[:-w], 1e-9)) * np.sqrt(w)
    nc = c / en[:len(c)]
    j = int(np.argmax(nc))
    if nc[j] > mejor[0]: mejor = (float(nc[j]), 4 + (j + w) / sr, float(fin))
r, ini, fin = mejor
est = leer(SR, 2).copy()
a, b, n = int(ini * SR), int(fin * SR), int(FUNDIDO * SR)
curva = np.linspace(0, np.pi / 2, n)
# el final del bucle se funde hacia lo que suena justo antes de volver al inicio
est[b - n:b] = (est[b - n:b].T * np.cos(curva) + est[a - n:a].T * np.sin(curva)).T
salida = est[:b]
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'libvorbis', '-q:a', '5', dst], input=salida.astype('float32').tobytes(), check=True)
print(f'parecido {r:.3f} · bucle de {a / SR:.3f} a {b / SR:.3f} s · largo {(b - a) / SR:.1f} s')
