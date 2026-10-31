# La Última Llama

Dungeon crawler dark fantasy de grupo. Reunís cuatro portadores al azar, bajás a la Cripta de Vel'Ombra con una sola
antorcha y peleás por turnos según la velocidad de cada uno. Quien cae, cae por esa expedición: puede volver más
adelante como reclutable, con condiciones.

## Cómo correrlo

```bash
npm start
```

| Comando | Para qué |
|---|---|
| `npm start` | Abre el juego en Electron |
| `npm run prueba` | Lo mismo, pero sin guardar nada |
| `npm run web` | Servidor en http://localhost:8123 (`?prueba` para no guardar) |
| `npm run simular` | Mide el balance: un bot juega 1000 expediciones |
| `npm run dist` | Genera el ejecutable en `dist/` |

Sin servidor no funciona con doble clic en `index.html`: el juego lee archivos JSON y analiza sus imágenes.

## Cómo está organizado

| Carpeta | Qué hay |
|---|---|
| `datos/` | Contenido en JSON: clases, personajes, habilidades, enemigos, mazmorra y diálogos |
| `interfaz/` | Arte: retratos, texturas, enemigos, HUD y accesorios del mapa |
| `js/nucleo.js` | Reglas, sin pantalla ni sonido |
| `js/juego.js` | Presentación y flujo de la partida |
| `js/` (el resto) | Motor: raycaster, dithering, generación de niveles, sonido y menús |
| `tools/` | Servidor, simulador y conversión de arte |
| `juego_viejo/` | El juego anterior (personaje único), completo. Se abre en http://localhost:8123/juego_viejo/ |

Parte del motor viene del juego anterior y `js/juego.js` reemplaza lo que hace falta: varias funciones de esos
archivos quedaron sin uso y se pueden limpiar con el tiempo.

## La regla del estilo

Todo se dibuja como brillo en gris, se le aplica la luz y recién al final pasa a los **6 tonos** de la paleta del piso
con **dithering Bayer 4×4**, en 480×270. Sólo el fuego y el rojo de la vida quedan fuera, como acentos.

## Agregar arte

1. Pedir el dibujo con formas grandes, buen contraste y fondo magenta liso, un objeto por imagen.
2. Prepararlo con `python tools/preparar_enemigo.py origen.png destino.png 128`. Para algo que cuelga del techo se agrega la altura: `... 128 60`.
3. Sumarlo a la lista que corresponda en `datos/mazmorra.json` (`accesorios`) o en `datos/enemigos.json`.

La migración a Godot, si se hace, está en [MIGRACION_GODOT.md](MIGRACION_GODOT.md). Lo que sigue, en [ROADMAP.md](ROADMAP.md).
