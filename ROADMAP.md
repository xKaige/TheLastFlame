# Roadmap

El camino del juego es la expedición de grupo. El plan del juego anterior está en `juego_viejo/ROADMAP.md`.
Steam sigue en pausa hasta que el juego esté pulido; sus notas están en `juego_viejo/STEAM.md`.

## Orden de trabajo

Por partes: primero la base y el piso 1 (La Cripta) terminado. Después se remodela el piso 2, y recién entonces el resto.
Lo próximo son más objetos y más historia para el piso 1.

## Reglas decididas

- **Zonas:** cada 3 pisos son una zona, con nivel máximo 10, 20, 30... (`zonas` en `datos/mazmorra.json`). En un piso de una zona ya superada el personaje no gana experiencia.
- **Continuar:** la expedición se guarda sola explorando, nunca en medio de una pelea. Morir no se deshace cerrando el juego.

## Pendiente de elegir

- Cómo se muestran los objetos (F8) y el nivel (F9). Al decidir se borran esas dos teclas.
- Protagonistas fijos o sólo personajes al azar.

## Falta para que sea un juego completo

- **Eventos:** el piso 1 tiene cinco y el peregrino (`datos/eventos.json`); faltan los de los otros pisos y las misiones.
- **Más variedad:** hoy son 7 objetos, 18 habilidades y 10 enemigos; faltan escenarios de batalla propios para Los Salones y El Fondo.
- **Más historia:** diálogos entre personajes del grupo, y Aldemar y La Sombra con más escenas.
- **Traducciones:** el sistema de idiomas está listo; faltan textos en inglés (`node tools/textos_faltantes.js en`).
- **Música de exploración:** pendiente del archivo.

## Arte

- Velas sobre la calavera: siguen con el dibujo viejo.
- Grillete: poco contraste contra el muro.
- Retratos: faltan los PNG originales sin marco.

## Limpieza

- Quitar del motor lo que quedó sin uso (combate, creación de personaje, partidas del juego anterior).
