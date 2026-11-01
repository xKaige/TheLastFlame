# Le baja los golpes a un tema sin tocar lo sostenido: separa lo armónico de lo percusivo con filtros de mediana.
# Uso: python tools/suavizar_ritmo.py origen destino.wav [cuanto_percusivo_queda] [segundos]
import subprocess, sys
import numpy as np
from scipy.ndimage import median_filter, uniform_filter1d
from scipy.signal import butter, istft, sosfiltfilt, stft

src, dst = sys.argv[1], sys.argv[2]
queda = float(sys.argv[3]) if len(sys.argv) > 3 else 0.12
hasta = sys.argv[4] if len(sys.argv) > 4 else None
SR, N, H = 48000, 4096, 1024

corte = ['-t', hasta] if hasta else []
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, *corte, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
x = np.frombuffer(raw, 'float32').reshape(-1, 2).T
sal = []
for canal in x:
    _, _, Z = stft(canal, SR, nperseg=N, noverlap=N - H)
    M = np.abs(Z)
    arm = median_filter(M, size=(1, 41))         # sostenido en el tiempo
    per = median_filter(M, size=(61, 1))         # ancho en frecuencia y breve: un golpe
    masc = arm ** 2 / (arm ** 2 + per ** 2 + 1e-12)
    _, y = istft(Z * (masc + queda * (1 - masc)), SR, nperseg=N, noverlap=N - H)
    sal.append(y[:len(canal)])
y = np.array(sal).T


# Los graves laten aunque no sean golpes: se empareja su volumen contra el promedio de unos segundos
def suave(v, seg):
    n = int(SR * seg / 2) | 1
    return uniform_filter1d(uniform_filter1d(v, n, mode='nearest'), n, mode='nearest')


graves = sosfiltfilt(butter(4, 300, 'low', fs=SR, output='sos'), y, axis=0)
agudos = y - graves
env = np.sqrt(suave((graves ** 2).sum(1), 0.05) + 1e-8)
y = graves * np.clip(np.sqrt(suave((graves ** 2).sum(1), 4) + 1e-8) / env, 0.25, 3)[:, None] * 0.6 + agudos
y *= 0.89 / abs(y).max()
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', dst], input=y.astype('float32').tobytes(), check=True)
print('listo', len(y) / SR, 's')
