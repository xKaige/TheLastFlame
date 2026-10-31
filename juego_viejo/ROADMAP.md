# La Última Llama — Roadmap

Rejugabilidad y camino a Steam, en fases que dejan algo jugable cada una.
Marcar con `[x]` lo terminado. Detalle de lo existente: ver `README.md`.

**Idea central:** al terminar cada partida (ganes o mueras) se gana **Ceniza**. Se gasta en el
**Altar de la Llama** entre partidas para desbloquear **variedad** (no poder bruto). Los
**modificadores de expedición** son dificultad opcional que multiplica la Ceniza.

---

## Fase 0 — Bases (chica) ✅
Lo que hace falta antes de la metaprogresión.
- [x] **Perfil persistente** (`js/profile.js`): guardado aparte de las partidas (Ceniza, desbloqueos,
      estadísticas, historial), con versión propia. Es lo que después se sincroniza con Steam Cloud.
- [x] **Llamas por partida:** 3 vidas. Cada muerte gasta una y renaces con el Rescoldo como antes;
      al perder la última, la partida termina (se borra el autoguardado).
- [x] **Pantalla de fin de partida ("epitafio"):** piso alcanzado, enemigos vencidos, reliquias,
      causa del final, récord. Ahí se mostrará la Ceniza ganada.
- [x] **Probar Electron:** arranca, el guardado persiste y la ventana escala ×3 exacta.
      Pendiente probar a mano: mando, F11 y sin conexión (las fuentes vienen de Google: fase 5).

## Fase 1 — El ciclo mínimo (mediana) ⭐ la más importante
- [x] **Ceniza** al final de cada partida (`ashFor` en `js/meta.js`): profundidad ×4, jefes ×15,
      reliquias ×5, eventos ×3, criaturas ÷2, victoria +30; × modificadores. Victoria limpia ≈ 190.
- [x] **Altar de la Llama** (desde el título): 9 desbloqueos por ~490 de Ceniza en total —
      equipo alternativo por clase (hacha+pavés, estoque+broquel, cetro+orbe), Runa del Rayo,
      Runa del Rey, La Campana Enterrada, La Puerta que Respira, +1 poción y +1 aceite iniciales.
- [x] **3 modificadores** en "Preparar la expedición" (después de crear el personaje):
      La Llama Agonizante (+50%), Los Muertos Recuerdan (+50%, sólo enemigos comunes),
      Una Sola Llama (+75%). La elección se recuerda.
- [x] **Simulador** con modificadores: `simMany(n, ['muertos'])`. Medición (bot perfecto):
      sin modificadores y con Agonizante o Una Sola Llama gana todo; con Los Muertos Recuerdan
      el Pícaro pierde ~la mitad (en el jefe final); Caballero y Hechicero ganan.
- [ ] 🎮 **Prueba con jugadores reales:** ¿dan ganas de otra partida? ¿la Ceniza alcanza o sobra?

## Fase 2 — Contenido para desbloquear ✅
- [x] Los 6 eventos del documento de ideas, cada uno con su dibujo y desbloqueable en el Altar
      (La Campana Enterrada, La Puerta que Respira, El Caballero Arrodillado, La Niña de la Linterna,
      El Ataúd del Rey sin Nombre —puede dar una ranura de runa—, El Reflejo que no te Pertenece).
- [x] Runas Rayo, Rey y Destino (una vez por nivel, un golpe mortal te deja con 1 de vida).
- [x] 3 reliquias nuevas: Lágrima de Cera, Manto del Ahorcado, Dado de Hueso.
- [x] Dos equipos iniciales alternativos por clase (se elige en "Preparar la expedición").
- [x] **Códice** desde el título (`js/codex.js`): bestiario con lo vencido, runas, reliquias, encuentros.
- [x] Extra: **Santuario** entre pisos (`js/shrine.js`), tras cada jefe: fogata que te recupera una vez
      y el **Mercader de Huesos**, que compra equipo viejo por óbolos y vende pociones, aceite y runas.

## Fase 3 — Metas a largo plazo ✅
- [x] **Finales alternativos** al vencer al jefe final: La Llama Perdura, El Nuevo Habitante,
      El Relicario Viviente (5 reliquias), La Leyenda (3 desafíos). Los dos últimos dan Ceniza extra.
- [x] **12 logros internos** (`ACHIEVEMENTS`), pensados para convertirse 1 a 1 en logros de Steam.
- [x] Modificadores nuevos: La Sombra del Rescoldo (tu sombra, con tu retrato, custodia el Rescoldo),
      La Última Ofrenda (sin pociones ni aceite) y El Mundo Invertido (la oscuridad cura, la luz quema).
      Medición del bot: gana casi todo con cada uno; El Mundo Invertido le cuesta al Pícaro.

## Fase 4 — Desafíos ✅
- [x] **Azar con semilla** (`grand`/`seedRng` en `js/util.js`): `rnd`/`chance`/`pick` usan la semilla de
      la partida y cada nivel se resiembra al entrar, así el mapa no depende de cómo jugaste antes.
      Lo visual y la música usan `vrnd`/`vpick`. Verificado: misma semilla → mismos niveles, y dos
      partidas completas del bot con la misma semilla terminan idénticas.
- [x] **Expedición diaria** (`js/daily.js`, desde el título): semilla, clase, raza y 1–2 desafíos salen
      de la fecha; atributos fijos, todo el contenido despierto y sin beneficios del Altar.
- [x] **Puntuación** (`scoreFor`): profundidad, jefes, criaturas, reliquias, eventos, victoria y rapidez,
      menos muertes, × desafíos. Récords locales (10 mejores) en el Códice; mejor diaria por fecha.
- [x] Fin de partida: "Repetir esta semilla" / "Reintentar la diaria".

## Fase 5 — Steam (casi lista: falta lo que depende de tener App ID) ⏸️ en pausa
> 2026-10-29: todo lo de Steam queda en pausa hasta pulir el juego (ver Fase 6).
- [x] **Sin conexión:** fuentes Grenze locales (`assets/fonts`, OFL) en `css/fonts.css`. Verificado con
      internet bloqueado: el juego no hace ningún pedido externo.
- [x] **Guardado en archivos** (`ipc.js` + `preload.js` + `js/store.js`): en Electron cada clave es un
      `.json` en `%APPDATA%/la-ultima-llama/saves` (lo que sincroniza Steam Cloud); en el navegador sigue en
      localStorage. Lo guardado por versiones anteriores se pasa solo a archivo.
- [x] **Opciones** (`js/settings.js`, desde título y pausa): volumen general, música y efectos (buses
      separados), temblor de pantalla, pantalla completa, idioma y **controles reasignables**.
- [x] **Puente con Steamworks** listo: logros (`ACH_*`) y tablas (`puntuacion`, `diaria-AAAA-MM-DD`).
      Se activa con `steamworks.js` + `steam_appid.txt`. **Sin probar con Steam real** (no hay App ID).
      Pasos en `STEAM.md`.
- [x] **Juego completo en inglés** (`js/i18n.js` + `js/i18n-en.js`): menús, panel, combate, eventos,
      objetos, habilidades, registro, diálogos, cinemática, códice, logros y finales. Se elige el idioma
      la primera vez que se abre el juego y después en Opciones. Verificado con un recorrido automático
      de todas las pantallas más 6 partidas del bot en inglés: ningún texto quedó en español.
- [ ] Cuenta de Steamworks, App ID, probar el puente con `480`, configurar logros/tablas/Cloud, SteamPipe.
- [ ] Probar a mano con mando / Steam Deck.
- [ ] Arte final opcional (PNG en escala de grises: el motor ya los pasa por paleta y dithering).

## Fase 6 — Pulido ⭐ prioridad actual
Lista sacada de una partida de prueba (2026-10-29, Caballero, murió en el Rey del Osario).
**Jugabilidad y claridad**
- [x] El combate no gira la vista hacia un enemigo que ataca de costado o por la espalda (`startCombat`).
- [x] Mochila (10) llena de equipo repetido en un piso: los cofres no se abren. Equipar lo mejor / tirar lo peor de una.
- [x] Morir contra un jefe: se cura entero y renacés sin pociones ni aceite → espiral de muertes.
- [x] Los puntos de atributo sin gastar casi no se notan en el panel.
- [x] "Llama" son las vidas y también la barra de la antorcha: confunde.
- [x] La antorcha alcanza justo en el Piso I (nivel completo: de 100 a 12): consumo 0,85 → 0,78. Confirmar con jugadores.
- [x] Contra lápida/escudo el menú muestra el daño normal y Golpe Brutal se desperdicia.
**Textos**
- [x] Artículos: "Te enfrentas a El Rey del Osario", "¡Centinela del Osario te embosca!".
- [x] "Tu llama renace al inicio del nivel. (1 vez)" se lee raro.
- [x] "Repartí tus puntos" es el único voseo (el resto va de tú).
- [x] "Ataque ~7" en la creación se lee como "−7".
- [x] Líneas repetidas en el registro ("El cofre está vacío." ×4): agruparlas.
**Interfaz**
- [x] Inventario: nombres cortados en las columnas.
- [x] Altar: la lista se sale del marco y no se distingue qué alcanza la Ceniza.
- [x] Fin de partida: falta "Ir al Altar".
- [x] Creación: ayuda pegada al borde y hueco entre raza y clase; título: subtítulo pegado al menú.
- [x] Cinemática: una escena queda casi negra.
- [x] Resultado de evento con una sola opción muestra "↑↓ elegir".
- [x] README: la sección "Pendiente" está desactualizada.
Extra: "Capucha de cuero de cuero" / "Botas de cuero de cuero" → Capucha de cazador, Botas altas.
- [x] **Cinemática para cada final** (`js/endings.js`): La Llama Perdura (subida y amanecer), El Nuevo Habitante
      (el trono, apagás tu antorcha), El Relicario Viviente (las reliquias reencienden la Llama), La Leyenda
      (la hoguera de la aldea, con tu nombre). Se pueden volver a ver desde el Códice.
- [x] **Pícaro con dos dagas:** sin escudos; Atacar da un segundo golpe con la daga de la mano izquierda
      (20–50% del daño según su calidad, con fallo y crítico propios). Medición del bot que sólo ataca:
      gana 7/12 con dos dagas contra 1/12 sin el segundo golpe; el bot normal (que usa Puñalada) gana todo igual.
- [x] Armas con materiales propios (piedra/hueso → hierro/plata → legendarias); el cuero y el lino, sólo ropa.
- [x] Los textos que se desplazan no vuelven al principio al moverse por el inventario o un menú.
- [x] **Ímpetu** en vez de recargas: atacar, defender o esquivar dan 1 (hasta 3); las habilidades cuestan 1–3.
      Antes cada pelea se abría con la habilidad y moría todo de un golpe. Bot (30 partidas): Caballero y
      Hechicero 10/10, Pícaro 9/10 con ~1 muerte por partida; los jefes duran ~14–17 turnos (antes 8–12).
- [x] **Modo prueba** (`npm run prueba` o `?prueba`): menú Pruebas para ver los finales y saltar al jefe; no guarda nada.
- [ ] **Batalla en grupo** (rumbo tipo Thysiastery): prototipo en `js/batalla.js`, desde Pruebas: pantalla completa, 3 aliados
      controlables con Ímpetu propio, 3 enemigos, turnos por velocidad. Falta decidir el sistema y conectarlo a la partida.
- [x] **Expedición** (`expedicion/`, guía en `expedicion/MIGRACION.md`): prototipo del juego nuevo aparte del base, preparado para migrar a Godot.
**Sin revisar todavía:** Pisos II–III, Santuario y Mercader, salas secretas, finales, diaria, Opciones, inglés.

---

**Dependencias:** la 1 necesita la 0; la 2 tiene sentido con el Altar hecho; los logros (3) y
las tablas (4) alimentan Steam (5). La prueba de Electron se puede adelantar.
**Plan:** hacer 0 + 1 de corrido y parar a probar con gente antes de la 2.
