# Expedición: prototipo y guía de migración a Godot

Prototipo del juego nuevo: grupo de portadores, turnos por velocidad y muerte por expedición.
El juego base (carpeta raíz) no se modifica: esta carpeta carga sus scripts tal cual y agrega una capa encima.

## Cómo probarlo

```bash
npm run web
```

Abrir http://localhost:8123/expedicion/. Funciona con el servidor, no con doble clic ni en Electron, porque lee los JSON de `datos/`.
Medir el balance sin pantalla: `node expedicion/simular.js 1000`.

El progreso (Ceniza y caídos) se guarda aparte, en la clave `expedicion.estado`. No toca las partidas del juego base.

## Cómo está separado

| Parte | Archivo | En Godot |
|---|---|---|
| **Contenido** | `datos/*.json` | Se copia igual y se lee con `JSON.parse_string` |
| **Reglas** | `nucleo.js` | Se traduce a GDScript casi línea por línea |
| **Prueba de reglas** | `simular.js` | Script de prueba que corre sin ventana |
| **Presentación y flujo** | `juego.js`, `estilo.css` | Se rehace con escenas y nodos |
| **Mazmorra, arte y sonido** | `js/` del juego base | Se rehacen o se exportan (ver abajo) |

`nucleo.js` no toca pantalla, sonido ni guardado. Recibe datos y una función de azar, y devuelve **eventos**
(`dano`, `cura`, `esquiva`, `muerte`, `texto`). La presentación sólo los muestra. Conservar esa separación es lo que hace barata la migración.

## Datos

- `clases.json`: guerrero, pícaro, mago, sanador (estadísticas y habilidades).
- `modelos.json`: los 10 modelos (título, raza, nombres, rasgo, bonos y aspecto). Personaje = modelo + clase.
- `habilidades.json`: costo de Ímpetu, objetivo y lista de efectos. Una habilidad nueva no necesita código si usa efectos existentes.
- `enemigos.json`: estadísticas, velocidad, sprite y ataque especial de jefes.
- `mazmorra.json`: tamaño del grupo, niveles, grupos de enemigos, Ceniza y reglas de los caídos.
- `dialogos.json`: nodos con quién habla, líneas y opciones con efectos.

## Equivalencias sugeridas

| Acá | Godot |
|---|---|
| `NUCLEO` | `Nucleo.gd` (autoload o clase con funciones estáticas) |
| Objetos de personajes y batalla | `Dictionary` o `Resource` |
| Eventos devueltos | `Array` de `Dictionary`, o señales |
| `azarX` | `RandomNumberGenerator` con semilla |
| `dibujarBatalla` y tarjetas | Escena `Batalla.tscn` con `Control` |
| `charla()` | Escena de diálogo que lee `dialogos.json` |
| Raycaster y dithering | Mazmorra 3D por casillas con un shader de paleta y tramado |
| Arte procedural | Exportar los sprites a PNG desde el juego actual |
| `localStorage` | `user://` (archivos JSON, compatible con Steam Cloud) |

## La regla del estilo

Es la identidad del juego. Todo se dibuja como brillo en gris, se le aplica la luz y recién al final pasa a los
**6 tonos** de la paleta del piso con **dithering Bayer 4×4**, en 480×270. Vale para mazmorra, batalla, retratos,
casilleros y mano. La interfaz usa los mismos tonos. Sólo el fuego y el rojo de la vida quedan fuera, como acentos.
El arte nuevo no necesita venir en este estilo: alcanza con formas grandes y buen contraste, y el juego lo convierte
(`pasar_a_paleta.py` muestra el proceso). En Godot esto es un shader de pantalla completa.

## Pantalla completa

`index.html` carga `js/util.js` del juego base con la vista en 480×270 (reemplaza esa línea en memoria), sin modificar el archivo.
Al migrar o reemplazar el juego base, ese truco desaparece: la vista completa pasa a ser la medida normal.

## Lo que todavía no es definitivo

- Balance: lo medido viene de un bot simple y hay que confirmarlo con personas.
- La expedición dura dos niveles y una guarida, con 8 habilidades y 5 enemigos.
- Los retratos salen de una hoja comprimida con `recortar_retratos.py`; faltan los PNG originales sin marco.
- Sólo está en español. Faltan equipo, botín, eventos propios y el resto de los pisos.
- Protagonistas fijos o sólo personajes al azar: sigue sin decidir.
