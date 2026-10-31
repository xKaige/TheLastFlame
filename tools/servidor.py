# Servidor local para probar el juego en el navegador.
# A diferencia de "python -m http.server", le pide al navegador que no guarde
# los archivos en caché: así cada recarga usa siempre el código más nuevo.
# Uso: python tools/servidor.py   (y abrir http://localhost:8123)
import http.server
import os
import socketserver

PUERTO = 8123


class SinCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()


os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
# con hilos: una conexión que queda colgada (fuentes, recargas) no traba a las demás
socketserver.ThreadingTCPServer.allow_reuse_address = True
socketserver.ThreadingTCPServer.daemon_threads = True
with socketserver.ThreadingTCPServer(("", PUERTO), SinCache) as httpd:
    print(f"La Última Llama en http://localhost:{PUERTO}")
    httpd.serve_forever()
