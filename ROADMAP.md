# Roadmap

El camino del juego es la expedición de grupo. El plan del juego anterior está en `juego_viejo/ROADMAP.md`.

**Versión actual: 0.3.8.** Lo próximo: 0.3.9.

## Cómo se numeran las versiones

- **Parche (0.3.x):** cada tanda de cambios que se sube al juego. Arreglos, ajustes y contenido dentro de lo que ya existe.
- **Versión (0.x.0):** una etapa grande terminada, como un piso remodelado.
- **1.0.0:** el juego completo, listo para publicar.

Cada parche sube la versión en `package.json` y en `index.html`, y se anota acá: pasa de "Próximas versiones" a "Historial". Lo que surja en el camino se agrega al parche que corresponda.

## Próximas versiones

### 0.3.9: Archivos pendientes del piso 1

- Música de exploración, cuando esté el archivo.
- Retratos: conseguir los PNG originales sin marco.

### 0.4.0: Piso 2 (Los Salones)

- Remodelar el piso y cambiar los dibujos de sus enemigos.
- Escenario de batalla propio.
- Eventos y misiones propios.
- Animar a su jefe cuando tenga el dibujo definitivo.

### 0.5.0: Piso 3 (El Fondo)

- Remodelar el piso y hacerlo más grande.
- Cambiar los dibujos de sus enemigos.
- Escenario de batalla propio.
- Eventos propios.
- Animar a su jefe cuando tenga el dibujo definitivo.

### 0.6.0: Idiomas

- Completar el inglés (`node tools/textos_faltantes.js en`).
- Sumar los demás idiomas que se elijan.

### 0.7.0: Pulido final

- Quitar del motor lo que quedó sin uso (combate, creación de personaje, partidas del juego anterior).
- Balance de toda la expedición, de punta a punta.

### 1.0.0: Publicación

- Steam sigue en pausa hasta que el juego esté pulido. Sus notas están en `juego_viejo/STEAM.md`.

## Reglas decididas

- **Orden de trabajo:** primero se termina el piso 1, después se remodela el piso 2 y recién entonces el resto.
- **Zonas:** cada 3 pisos son una zona, con nivel máximo 10, 20, 30... (`zonas` en `datos/mazmorra.json`). En un piso de una zona ya superada el personaje no gana experiencia.
- **Continuar:** la expedición se guarda sola explorando, nunca en medio de una pelea. Morir no se deshace cerrando el juego.
- **Botín:** los objetos raros (✦) salen el 20% de las veces, y el 70% si los suelta un jefe (`botin` en `datos/mazmorra.json`).
- **Personajes:** no hay protagonistas fijos. Son al azar, se conocen entre sí, y la historia importante está en notas por la mazmorra.
- **Primera expedición:** arranca con las 4 clases y no se pueden repetir.
- **Modelos y clases:** cada retrato tiene su clase fija.
- **Título:** el logo "The Last Flame" no cambia con el idioma.

## Historial

### 0.3.8

- Logo pixelado, con la paleta del juego y su tramado.

### 0.3.7

- Dibujos nuevos para el portador del peregrino y el brasero del santuario, encendido y apagado.

### 0.3.6

- Dibujos nuevos para las velas sobre la calavera y para las notas.

### 0.3.5

- Fondo nuevo en el título: Vel’Ombra apagada.
- La sangre y el fuego conservan su color en las ilustraciones de los eventos.
- Eventos más visibles en el mapa y grillete con más contraste.
- Quitadas las teclas de prueba F8 y F9.

### 0.3.4

- Vínculos entre personajes: charlas que avanzan entre expediciones y duelo cuando cae alguien conocido (`datos/vinculos.json`).
- Diez notas repartidas por los tres pisos con la historia de Aldemar y La Sombra (`datos/notas.json`), que se releen en el Hogar.

### 0.3.3

- Veintiún objetos: los nuevos suman rarezas y objetos raros con contras.
- El botín prefiere lo que el grupo todavía no tiene, y los jefes sueltan más objetos raros.

### 0.3.2

- Cinco eventos para el piso 1, con ilustración y opciones según atributos (`datos/eventos.json`).
- Plantel inicial con las 4 clases.
- Detalle de las acciones en la pelea.
- El objetivo elegido se marca en la línea de tiempo.

### 0.3.1

- Logo en el título.
- La primera expedición no repite clases.

### 0.3.0

- Base de la expedición de grupo y piso 1 jugable.
- Continuar la expedición y nivel máximo por zona.
- Cada retrato con su clase, y emboscadas sólo de costado o por la espalda.
