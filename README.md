# La Última Llama — prototipo

Dungeon crawler RPG en primera persona, por casillas (estilo Wizardry / Eye of the Beholder),
dark fantasy con estética de grabado gótico y *dithering* de paleta limitada. Meta: publicarlo en Steam
(empaquetado con Electron). Hecho en HTML + CSS + JavaScript puro, sin dependencias ni paso de compilación.

> Este documento es el punto de partida para retomar el proyecto en otra conversación:
> resume qué está hecho, cómo está armado el código, cómo probar y qué falta.
> El plan de rejugabilidad y Steam está en **`ROADMAP.md`**.

---

## Cómo correrlo

```bash
python tools/servidor.py
```

Abrir http://localhost:8123. Usar este servidor y no `python -m http.server`: desactiva la caché
del navegador, así cada recarga usa el código nuevo. Si aun así algo se ve viejo, `Ctrl+F5`.
También funciona con doble clic en `index.html`.

Escritorio (Electron): `npm install` y `npm start`. Para pasarlo a alguien: `npm run dist` (cada vez que cambia el código) y comprimir `dist/win-unpacked`. Publicar en Steam: ver **`STEAM.md`**. Probado: arranca, guarda y escala ×3 en 1440×810;
los tres modos de pantalla (Opciones → Pantalla) están probados; falta probar a mano el mando.

### Controles
| Acción | Teclado | Mando |
|---|---|---|
| Avanzar / retroceder | W S / ↑ ↓ | D-pad ↑ ↓ / stick |
| Girar | Q E / ← → | D-pad ← → |
| Paso lateral | A D | LB RB |
| Interactuar / bajar escalera | Enter / Espacio | A |
| Poción / Aceite | P / O | X / Y |
| Inventario (tirar: X / Supr) | I / Tab | View |
| Habilidades / Atributos / Runas | H / U / R | — (desde la pausa) |
| Combate | 1-8 o ↑↓ + Enter | D-pad + A |
| Pausa (guardar, cargar, menús) | Esc | B / Start |
| Ventana / pantalla completa | F11 | — |

---

## Qué está hecho

### Estructura de la partida
- **Título → creación de personaje → cinemática → 3 pisos × 5 niveles → victoria.**
- Cada piso es un lugar distinto (`js/themes.js`): mapa, paredes, suelo, techo, objetos decorativos,
  paleta, música y emblema del marco.
  | Piso | Mapa | Paleta | Jefe (nivel 5, en su guarida) |
  |---|---|---|---|
  | I · La Cripta | salas chicas, pasillos angostos | sepia/verde | El Rey del Osario (osario de calaveras) |
  | II · El Castillo | salones con columnatas, galerías anchas | violeta/naranja | El Cazador Gris (salón de trofeos) |
  | III · El Fondo | cavernas orgánicas (autómata celular) | grabado b/n | El Que Habita la Oscuridad (Cámara de la Llama) |
- Niveles 1–4 tienen escalera; el 5 es la guarida: al vencer al jefe aparece la bajada al **Santuario**
  (nivel 0) del piso siguiente: fogata, Mercader de Huesos y escalera al nivel 1.
- Para que la escalera no se pierda: el mapa marca con un punto las salidas sin explorar, la escalera se
  ve hasta a 6 casillas si está a la vista, y si no la encontrás, a los 160 pasos en el nivel una corriente
  de aire te da la dirección y a los 280 queda marcada (`stairsHint`).

### Personaje
- **Creación:** nombre, raza (Humano, Enano, Elfo, Mediano), clase y 5 puntos de atributo.
- **Clases** (dificultad): Caballero (fácil, armadura pesada), Hechicero (media, liviana, fuego),
  Pícaro (exigente, media, críticos y esquiva).
- **Pícaro con dos dagas:** no usa escudo; en la mano izquierda lleva una daga o un puñal. Con **Atacar**
  remata con un segundo golpe que hace una parte del daño común según la calidad de esa daga
  (`DUAL_PCT`: Común 20–35%, Fina 25–45%, Antigua 35–50%), con su propio fallo y su propio crítico.
  Sin daga en la mano izquierda, pega una sola vez. Los broqueles y rodelas de partidas viejas pasan a ser
  daga y puñal (`fixLegacyItem`).
- **Atributos** (`js/skills.js`): Fuerza, Vigor, Destreza, Voluntad. +1 punto en cada nivel par (`U`).
- **Habilidades:** 5 por clase, se aprenden en los niveles 1, 3, 5, 7 y 9 y suben de rango solas
  (4, 8, 9). Pasivas automáticas; libro con `H`.
- **Ímpetu** (`IMP_MAX`, `gainImpetu` en `js/skills.js`): las activas no se recargan, se pagan. Atacar,
  defenderse o esquivar un golpe dan 1 de Ímpetu (hasta 3) y cada activa cuesta 1–3 (`cost` en `SKILLS`).
  Arranca en 0 en cada combate: las peleas no se abren con el golpe grande.
- **Equipo** (`js/items.js`): arma, mano izquierda, casco, pechera, botas. Peso por clase
  (pesada/media/liviana), calidad Común/Fina/Antigua con un bono extra. Materiales: la ropa y la armadura
  van de cuero/lino/hierro hacia arriba; las armas (y la mano izquierda del Pícaro y del Hechicero) empiezan
  en piedra o hueso y suben a hierro o plata. El retrato del héroe
  (`js/heroes.js`) se dibuja según lo que tengas puesto.
- **Muerte con Rescoldo:** renacés al inicio del nivel; la experiencia en curso y la mochila quedan
  en un Rescoldo donde caíste. Si llegás a él, lo recuperás; si morís antes, se pierde.
- **Llamas:** 3 vidas por partida (`BAL.lives`). Al perder la última la partida termina, se borra el
  autoguardado y aparece el **epitafio** con el resumen; la partida queda registrada en el perfil.

### La antorcha (recurso central)
Se consume al caminar, achica el radio de luz, sirve de arma (Quemar: doble daño a lo que teme al fuego)
y sin ella la oscuridad te hiere. Aceite (`O`) la recarga. Bajo 25 avisa: chisporrotea, parpadea la
barra y suena un crepitar. Cinturón: máximo 5 pociones y 5 aceites.

### Progresión de la partida
- **Runas** (`js/runes.js`): 8, se encastran en 2 ranuras (3 tras vencer al Rey del Osario).
  Brasa, Sol, Aguas, Vida, Orden, Piedra, Umbral (abre paredes huecas de un golpe) y Vacío (las marca en el mapa).
  Salen de cofres, jefes (una segura cada uno), eventos y relicarios.
- **Reliquias** (`js/relics.js`): 5 pasivas permanentes con ventaja y contra (Corazón de Brasa,
  Cráneo del Verdugo, Ojo del Hereje, Moneda Funeraria, Cáliz del Penitente). Están en relicarios
  dentro de **salas secretas**: una pared agrietada suena hueca y se derrumba al tercer golpe
  (~53% de los niveles comunes).
- **Eventos con decisiones** (`js/events.js`): en ~50% de los niveles comunes. Hay 2: El Peregrino Ciego
  y El Altar de Ceniza. Se definen como datos.

### Enemigos
- Comunes: Rata de Osario, Kobold No-Muerto, Necrófago, Sombra Susurrante (roba llama, teme al fuego),
  Caballero Hueco.
- Con comportamiento propio:
  - **El Soplo:** te baja 2 de llama por turno mientras te ve a ≤3 casillas, aunque no pelees.
  - **El Acechador:** invisible fuera de la luz fuerte; si te embosca, su primer golpe pega +60%.
  - **Centinela del Osario:** cada dos turnos alza una lápida que frena tus golpes al 30%; el fuego pasa igual.
- Jefes con presentación, ataque especial cada 3 turnos, botín seguro y su propia música.

### Presentación
- Raycaster por casillas con movimiento animado, iluminación de antorcha y *dithering* Bayer 4×4.
- Arte 100% procedural: texturas por fórmula y sprites dibujados con Canvas en escala de grises
  que pasan por la paleta del piso. No hay imágenes externas.
- Combate con retrato grande animado (respira, se prepara, embiste, retrocede al recibir), arma propia en
  primer plano (tajo, hachazo, estocada, conjuro, antorcha), escudo o sello al defender, impactos según el
  arma y golpes enemigos sobre la pantalla (zarpazo, mordida, tajo, grietas, sombra). Números flotantes y
  enemigos que se deshacen en ceniza al morir.
- Cinemática de intro (10 escenas) con texto letra a letra y voces sintetizadas por personaje
  (narrador, Sombra, rey). Para voces grabadas: registrarlas en `assets/voz/voces.js` (clave `intro_escena_frase`;
  en los finales, `final_<final>_escena_frase`, p. ej. `final_luz_2_0`).
- **Cinemática por final** (`js/endings.js`): al elegir el final se ve su cinemática (el rey se deshace, la cámara
  de la Llama y después cada final por su lado) y luego el epitafio. En el Códice → Finales se pueden volver a ver.
- Música procedural (`js/music.js`): un tema por piso, uno para jefes de piso, uno para el final y la intro.
- Tipografía: Grenze Gotisch (títulos) y Grenze (texto), locales en `assets/fonts` (OFL): funciona sin conexión.
- Guardado: autoguardado (al empezar, al bajar de nivel, cada 30 pasos) + 3 ranuras. En Electron son archivos `.json` (Steam Cloud); en el navegador, `localStorage`.
- **Idiomas: español e inglés.** Los textos se escriben en español; el inglés está en `js/i18n-en.js`
  (la clave es el texto en español). Los mensajes, menús, diálogos y carteles se traducen solos al
  mostrarse; las frases con valores usan huecos: `tr('Golpeas a {0}: −{1}', nombre, daño)`. Los nombres
  de datos (razas, enemigos, runas…) se traducen en el lugar con `localizeAll()`. Los objetos guardan su
  nombre en español y `itemName(it)` arma el inglés. **Texto nuevo = sumar su inglés a `EN`.**
- Perfil (`js/profile.js`): lo que sobrevive entre partidas (estadísticas, historial; luego Ceniza y
  desbloqueos), en su propia clave con `PROFILE_VERSION`. Cada partida se cuenta una sola vez (`S.flags.runTag`).

---

## Cómo está armado el código

Scripts clásicos que comparten el ámbito global (sin módulos ni build); se cargan en el orden de
`index.html`. Resolución interna fija de 480×270 escalada; la vista 3D es de 300×180.

| Archivo | Contenido |
|---|---|
| `js/util.js` | constantes de pantalla, ruido, paletas (`RAMPS`), dithering, azar con semilla |
| `js/store.js` | almacenamiento (`STORE`: archivos en Electron, localStorage en el navegador) y puente `STEAM` |
| `js/settings.js` | opciones (volumen, temblor, idioma, iconos de botones) y teclas reasignables |
| `js/prompts.js` | iconos de teclado, Xbox y PlayStation (`glyph(acción)`; en textos, `[O]`, `[Enter]`…) y detección del mando |
| `js/i18n.js` / `js/i18n-en.js` | traducción: `tr('texto')`, `localizeAll()` y el diccionario inglés |
| `js/icons.js` | íconos SVG chicos del panel y del menú de combate (`icon(nombre)`) |
| `js/items.js` | razas, clases, equipo, botín, `recalc()` (todas las estadísticas derivadas) |
| `js/skills.js` | atributos, habilidades por clase y sus efectos, avisos emergentes, libro |
| `js/runes.js` | runas y su menú |
| `js/events.js` | eventos (datos + motor + dibujos) |
| `js/relics.js` | reliquias, salas secretas, relicarios |
| `js/art.js` | sprites de enemigos, jefes y objetos; pantalla de título |
| `js/themes.js` | texturas y objetos decorativos de cada piso, guaridas |
| `js/render.js` | raycaster, antorcha, retratos, marco, barras, minimapa |
| `js/combatfx.js` | efectos de combate: arma en primer plano, tajos por arma, partículas, golpes enemigos, animación del retrato |
| `js/heroes.js` | retrato del héroe armado por piezas de equipo |
| `js/cinematic.js` | motor de cinemáticas y la intro |
| `js/endings.js` | cinemáticas de los 4 finales (arte, guiones, efectos); también se ven desde el Códice |
| `js/audio.js` / `js/music.js` | efectos y voces / secuenciador y temas |
| `js/menus.js` | creación de personaje e inventario |
| `js/save.js` | guardado, carga y menús genéricos (título, pausa, ranuras) |
| `js/profile.js` | perfil persistente entre partidas, resumen y registro de cada partida |
| `js/meta.js` | Ceniza, Altar de la Llama (`UNLOCKS`), modificadores (`MODS`, `modOn`), preparar la expedición |
| `js/daily.js` | puntuación (`scoreFor`), récords y Expedición diaria |
| `js/codex.js` | códice (bestiario, runas, reliquias, encuentros), logros (`ACHIEVEMENTS`) y finales (`ENDINGS`) |
| `js/shrine.js` | Santuario entre pisos: fogata y Mercader de Huesos (vender equipo por óbolos) |
| `js/marquee.js` | textos que no entran en su renglón se desplazan como un cartel |
| `js/game.js` | estado, `BAL`, enemigos, generación de niveles, combate, muerte, entrada, bucle |
| `main.js` / `ipc.js` / `preload.js` | Electron: ventana y modo de pantalla (ventana, pantalla completa, sin bordes), guardado en archivos y Steamworks |
| `tools/servidor.py` | servidor local sin caché |
| `tools/simulador.js` | bot que juega partidas completas para medir el equilibrio |

### Convenciones útiles
- **Estado global:** `S` (partida), `P` (jugador), `C` (combate en curso), `S.world` (nivel actual).
- **Mapa:** `0` suelo · `1` muro · `2` escalera · `3` suelo de guarida.
  **Variante de muro (`wtype`):** 0-2 decoración del piso · 3 guarida · 4 pared hueca.
- **Entidades** (`S.world.ents`): `enemy`, `chest`, `prop`, `event`, `reliquary`, `ember`.
  Las sólidas se colocan verificando que nunca corten el paso.
- **Contenido como datos:** para sumar un enemigo → `ENEMIES` y `POOLS` (+ sprite en `art.js`; `idle` y
  `hitFx` eligen su animación y cómo se ve su golpe);
  una runa → `RUNES` + su efecto donde corresponda; un evento → `EVENTS`; una reliquia → `RELICS`
  + su efecto; una habilidad → `SKILLS` + `SKILL_ACT`.
- **Estadísticas:** todo lo pasivo (atributos, equipo, pasivas, runas, reliquias) se suma en `recalc()`.
- **Guardado:** `snapshot()` / `restore()` en `save.js`. Si se agrega un tipo de entidad o un campo
  del mundo, hay que sumarlo ahí. `SAVE_VERSION = 1`.

---

## Equilibrio

Todos los números están en `BAL` (arriba de `js/game.js`); los jefes, en `ENEMIES`.
Referencias actuales: antorcha 0,78 por paso, aceite +45, poción cura 6 + 30% de vida máxima,
2-3 cofres por nivel; enemigos +14% de vida y +9% de daño por nivel de profundidad;
jefes con 200 / 375 / 520 de vida.

**Azar con semilla:** usar siempre `rnd`/`chance`/`pick`/`grand` en la lógica (nunca `Math.random`),
y `vrnd`/`vpick` en lo visual y la música. Cada nivel se resiembra con `seedRng(semilla, piso, nivel)`.
En el simulador, `window.simSeed = 123` repite los mismos niveles.

**Metaprogresión:** cada partida deja Ceniza (`ashFor`), que se gasta en el Altar de la Llama.
Runas y eventos con `lock` sólo aparecen después de despertarlos. Los modificadores viven en `S.flags.mods`.

**Medir un cambio** (con el juego abierto, en la consola del navegador; `simMany(n, ['muertos'])` prueba modificadores):
```js
eval(await fetch('tools/simulador.js').then(r => r.text()));
simSummary(simMany(3))
```
Última medición (36 partidas): las tres clases ganan siempre; muertes por partida ~0 / ~0 / ~0,3 por piso
(el Pícaro algo más); pasos a oscuras por nivel ~8 / ~18 / ~26.
**Ojo:** el bot juega perfecto y **no** usa eventos ni salas secretas (juega sin reliquias). Falta
la prueba de un jugador real para decidir si hay que apretar la dificultad.

---

## Pendiente

Lo que falta y en qué orden está en **`ROADMAP.md`**: la prioridad actual es la **Fase 6 (pulido)**;
lo de Steam (Fase 5) está en pausa. La prueba con jugadores reales sigue pendiente para decidir la dificultad.
