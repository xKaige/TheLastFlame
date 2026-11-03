# Roadmap

El camino del juego es la expedición de grupo. El plan del juego anterior está en `juego_viejo/ROADMAP.md`.

**Versión actual: 0.4.37.** Lo próximo: 0.5.0.

## Cómo se numeran las versiones

- **Parche (0.3.x):** cada tanda de cambios que se sube al juego. Arreglos, ajustes y contenido dentro de lo que ya existe.
- **Versión (0.x.0):** una etapa grande terminada, como una zona remodelada.
- **1.0.0:** el juego completo, listo para publicar.

Cada parche sube la versión en `package.json` y en `index.html`, y se anota acá: pasa de "Próximas versiones" a "Historial". Lo que surja en el camino se agrega al parche que corresponda.

## Próximas versiones

### 0.5.0: Zona 3 (El Fondo)

- Remodelar la zona y hacerla más grande.
- Música de exploración.
- Reescribir el final: Aldemar pasa a ser el jefe del acto I, y al vencerlo se abre el suelo hacia la zona 4.

### 0.6.0: Habilidades

- Ya está en el juego (0.4.30): habilidades por clase, niveles con tope por zona y efectos nuevos.
- Falta: las transformaciones de los niveles 5 y 10 (`HABILIDADES.md`). Necesitan la zona 4 en adelante.

### 0.7.0: Runas

- Traer al grupo las runas del juego anterior (`juego_viejo/js/runes.js`: 8 runas, 2 ranuras y una tercera tras vencer a un jefe).
- Son la base de la rejugabilidad: entran antes que las zonas nuevas para que cada una pueda sumar las suyas.

### 0.8.0 a 0.13.0: Zonas 4 a 9

- Una zona por versión, con arte y música propios, hechos como los anteriores.
- La historia de cada zona está en "Historia", más abajo.
- La zona 9 suma los tres finales.

### 0.14.0: Idiomas

- Completar el inglés (`node tools/textos_faltantes.js en`).
- Sumar los demás idiomas que se elijan.

### 0.15.0: Pulido final

- Quitar del motor lo que quedó sin uso (combate, creación de personaje, partidas del juego anterior).
- Balance de toda la expedición, de punta a punta.
- Rejugabilidad.

### 1.0.0: Publicación

- Mostrar en los créditos los avisos de `js/pixelfx.LICENCIA.txt`.
- Steam sigue en pausa hasta que el juego esté pulido. Sus notas están en `juego_viejo/STEAM.md`.

## Ataques de jefes para retomar

Ideas aprobadas, para hacer con sprites propios (hojas de 6 cuadros, `golpe_especial` en `datos/enemigos.json`).

**El Cazador Gris**

- Marcar a la presa: olfatea, señala con la lanza y aparece la mira roja en el retrato.
- Silbido a la jauría: silba, la sala se oscurece y los perros entran corriendo desde los costados.
- Lanzazo de frente: clava la lanza hacia la pantalla, con el arma creciendo en primer plano.

**Aldemar**

- Lo que hiciste: Debilitado a un personaje y a quien tenga vínculo con él.
- Sin oscuridad: durante 2 turnos, curar a un aliado también daña a quien cura.

## Historia

La idea que une todo es una regla de las Guardianas: "quien le pida algo va a recibirlo". Cada zona es un pedido que la Llama concedió y salió horrible. Aldemar fue el último, no el primero.

**Acto I: El Rey**

1. La Cripta. Jefe: El Rey del Osario.
2. Los Salones. Jefe: El Cazador Gris.
3. El Fondo. Jefe y cierre del acto: Aldemar, El Que Habita la Oscuridad. Sin la Llama, el suelo se abre: ese fondo no era el fondo.

**Acto II: Los que pidieron**

4. La Veta. Mina infinita, oro que crece como una enfermedad, tonos ocre. Los mineros pidieron riqueza sin fin y siguen cavando, con oro en lugar de carne. Jefe: El Capataz, que todavía lleva la cuenta.
5. La Ciudad Anegada. Pueblo bajo un lago negro, tonos verdosos. Pidieron agua en una sequía y nunca dejó de subir. Jefe: La Ahogada, quien hizo el pedido.
6. El Claustro. Convento de las Guardianas, tonos blancos. No pidieron nada: su pecado fue permitirlo todo. Se aclara quién fue La Sombra, y las 40 hermanas del incendio hacen eco de los 40 caballeros. Jefe y cierre del acto, con fase: La Primera Guardiana.

**Acto III: Lo que había antes**

7. El Bosque sin Sol. Bosque subterráneo pálido, tonos de hueso y musgo. Alguien pidió que nada muriera, y todo crece encima de lo anterior. Jefe: El Primer Árbol.
8. El Campo de Ceniza. Llanura gris con ejércitos fósiles, tonos rojo y gris. Dos reyes pidieron ganar la misma guerra y todavía pelean. Jefe doble: Los Dos Reyes.
9. La Última Llama. Oscuridad casi total; la única luz es la antorcha del grupo. Jefe final, con fase: La Llama.

**Final:** la Llama nunca fue un fuego, es el hambre que olió el Cazador Gris. La antorcha del grupo es la última que queda. Antes de la pelea ofrece lo que quieras, y hay tres finales: pedir, ofrecerte o no decir nada. Los dos primeros terminan mal, de maneras distintas, y el tercero es el verdadero.

**Runas:** cada runa puede ser un resto de esos pedidos.

## Reglas decididas

- **Orden de trabajo:** primero se termina la zona 1, después se remodela la zona 2 y recién entonces el resto.
- **Extensión:** el juego tiene 9 zonas de unos 3 pisos cada una; la zona 9 es la final. Una expedición completa dura de 3 a 4 horas, unos 20 a 25 minutos por zona, y se puede guardar entre piso y piso.
- **Nombres:** lo que acá se llama zona, en el código es `piso` (`pisos` en `datos/mazmorra.json`), y lo que acá se llama piso, en el código es `nivel`.
- **Nivel máximo:** cada zona sube el tope 10 niveles: 10, 20, 30... hasta 90 en la zona 9 (`zonas` en `datos/mazmorra.json`). En una zona ya superada el personaje no gana experiencia.
- **Continuar:** la expedición se guarda sola explorando, nunca en medio de una pelea. Morir no se deshace cerrando el juego.
- **Botín:** los objetos raros (✦) salen el 20% de las veces, y el 70% si los suelta un jefe (`botin` en `datos/mazmorra.json`). No aparecen antes de la zona 2 (`zona` en `datos/objetos.json`).
- **Personajes:** no hay protagonistas fijos. Son al azar, se conocen entre sí, y la historia importante está en notas por la mazmorra.
- **Encuentros:** el enemigo del mapa siempre está en la pelea, en el centro. Los acompañantes salen de los grupos del piso.
- **Enemigos:** ninguno pelea igual; cada uno tiene al menos una habilidad propia, y cada jefe, una fase de furia distinta.
- **Primera expedición:** arranca con las 4 clases y no se pueden repetir.
- **Ímpetu:** Sanador y Mago arrancan cada pelea con 2, y en lugar de Defender tienen Concentrar: la misma protección, con +2 de Ímpetu (`impetu_inicial` y `concentra` en `datos/clases.json`).
- **Atributos mágicos:** Intelecto sube toda la magia, Fe sube las curas y habilita las más fuertes, y Arcano hace lo mismo con el fuego.
- **Armas:** cada arma es de una clase y pide atributos. Las de Mago y Sanador suman al ataque básico un porcentaje del Intelecto (`magico` en `datos/objetos.json`).
- **Crecimiento:** cada nivel da 1 punto para repartir, y cada 3 niveles los atributos propios de la clase suben solos. Cuanto más alto el atributo, menos rinde cada punto: vale entero hasta +20, la mitad hasta +50 y un cuarto después.
- **Modelos y clases:** cada retrato tiene su clase fija.
- **Título:** el logo "The Last Flame" no cambia con el idioma.

## Historial

### 0.4.37

- La Veta: los enemigos ya apoyan en el piso del escenario de batalla.

### 0.4.36

- La Veta: El Capataz con su dibujo, y cuatro enemigos propios: Minero Dorado, Veta Viva, Buscador y Vagoneta Hambrienta.

### 0.4.35

- Zona 4, La Veta: se baja al vencer a Aldemar. Muros, piso, techo, escenario de batalla y paleta propios.
- Por ahora usa los enemigos de El Fondo y un jefe provisorio.

### 0.4.34

- Ímpetu máximo 4.
- Guerrero: gana 1 de Ímpetu con cada golpe recibido y 2 al defender. Represalia carga Ímpetu a un aliado.
- Mago y Pícaro más moderados: Intelecto y Arcano suman 3% por punto, Puñalada pega 60% más con estado, y la Destreza suma 0,5% por punto a sus habilidades.
- Valores y cálculos de crecimiento en `CRECIMIENTO.txt`.

### 0.4.33

- Habilidades del Sanador: efectos nuevos de luz con pixelfx.

### 0.4.32

- Menú de personajes compacto: atributos y combate siempre visibles a la izquierda, pestañas Equipo y Habilidades, y comparación en vivo al mirar un objeto.

### 0.4.31

- Menús de objetos: la mochila se ordena por tipo, los bonos se leen completos y se compara con lo equipado.

### 0.4.30

- Sistema de habilidades: cada clase tiene las suyas, y suben de nivel con el uso, con tope por zona.
- Habilidades nuevas: Quebrantar, Golpe Final, Piel de Hierro, Represalia, Muro Viviente, Danza de Cuchillas, Sangre Fría, Oportunista, Detonar, Combustión y Fe Inquebrantable.
- Provocar da chance de contraatacar.
- Pícaro: Puñalada deja de ser crítico seguro y pega el doble a enemigos con estados. Baja su doble golpe.

### 0.4.29

- Último Aliento pasa a ser pasiva: los golpes pegan hasta 75% más cuanta menos vida te quede.

### 0.4.28

- Llama Arcana, Lanza Ígnea y Muro de Llamas: efectos nuevos de pixelfx.

### 0.4.27

- Aceite: 15% de encontrar un frasco tras cada pelea, los cofres lo aseguran con poca luz, y un piso nuevo deja un frasco si no te queda nada.

### 0.4.26

- Armas mágicas más parejas: suman del 25% al 45% del Intelecto al ataque.
- Los objetos raros salen desde la zona 2, y las armas raras piden más atributos.

### 0.4.25

- Tormenta de Fuego e Incendio: columnas de fuego de pixelfx que suben bajo cada enemigo.

### 0.4.24

- Jefes: las poses de furia ya no quedan quietas, respiran y la ropa ondula.

### 0.4.23

- Aldemar: Veo Todo, su furia, le devuelve al grupo su última habilidad. El llamado levanta a los Apagados caídos una vez por pelea, y al morir uno los demás se apuran.
- Los jefes tienen 50% más de vida (`vida_jefe` en `datos/mazmorra.json`).
- Las animaciones de jefes ya no agrandan el dibujo.

### 0.4.22

- Dificultad más alta: los enemigos tienen 30% más de vida y pegan 25% más.

### 0.4.21

- El Cazador Gris: La Cacería. En su furia apaga las antorchas, va por el más herido, y los golpes sólo lo alcanzan justo después de que ataca.

### 0.4.20

- Detalle de pelea: una línea por efecto, sin repetir ni nombrar a cada personaje.

### 0.4.19

- Peleas: la antorcha se ve arriba a la derecha.
- Peleas: el Detalle explica los buffs y debuffs de cada personaje.

### 0.4.18

- Aldemar: La Última Campanada, Nunca cierra los ojos, Ceniza en el cuenco y Déjenme descansar, cada una dibujada cuadro por cuadro.

### 0.4.17

- El Cazador Gris: cadena y gancho dibujados cuadro por cuadro en su furia, con la cadena que llega hasta el enganchado.

### 0.4.16

- El Rey del Osario: en su furia alza un trono de huesos. Mientras tenga escudos hace llover huesos, y al romperlos se derrumba y pierde un turno.

### 0.4.15

- El Cazador Gris: salto desde la penumbra dibujado cuadro por cuadro.

### 0.4.14

- Música de pelea para Aldemar: The Cursed King's Last Toll.

### 0.4.13

- Exploración: poción y aceite muestran con qué tecla se usan.
- Mochila: las pociones y el aceite aparecen como objetos.

### 0.4.12

- Crecimiento más lento: los atributos de clase suben solos cada 3 niveles.
- Los atributos muy altos rinden menos, para llegar sanos a nivel 90.

### 0.4.11

- Modo prueba: el grupo arranca en el nivel máximo de la zona elegida, con los puntos ya repartidos.

### 0.4.10

- Personajes: la tecla I explica qué hace el atributo elegido.

### 0.4.9

- Personajes: ya se puede bajar hasta Arcano y Perspicacia en la lista de atributos.

### 0.4.8

- El Rey del Osario: golpe a todo el grupo dibujado cuadro por cuadro, con la sala que se apaga antes del impacto (`golpe_especial` en `datos/enemigos.json`).

### 0.4.7

- El atributo Ardor pasa a llamarse Arcano.

### 0.4.6

- Atributos nuevos: Fe para las curas y Ardor para el fuego.
- Cuatro habilidades nuevas: Gracia, Milagro, Lanza Ígnea e Incendio.
- Las armas son por clase y tienen requisitos. Nueva arma de Sanador: Báculo de la Guardiana.
- Las armas de Mago y Sanador suman parte del Intelecto al ataque básico.

### 0.4.5

- Ilustraciones de los cinco eventos de la zona 3.

### 0.4.4

- Cinco eventos para la zona 3: el cuenco tibio, la que espera, la corona en la ceniza, las antorchas gastadas y la llama partida.

### 0.4.3

- Zona 3: adornos propios de pared y de piso.

### 0.4.2

- Zona 3: Aldemar con dibujo, animación y fase propia.
- Zona 3: cuatro enemigos nuevos con habilidades y animación: Portadora Velada, El Tachado, El Apagado y Portador Perdido.

### 0.4.1

- Zona 3: muros, piso y techo propios, y escenario de batalla.

### 0.4.0

- Zona 2 (Los Salones) terminada.
- Música de exploración de la zona 2: The Unfinished Banquet.

### 0.3.41

- Ilustraciones de los cinco eventos de la zona 2.
- Zona 2: candelabro de pared.

### 0.3.40

- Cinco eventos para la zona 2: el banquete servido, el retrato sin ojos, la guardia eterna, la trampa gris y la silla del rey.
- Cada evento pertenece a una zona (`piso` en `datos/eventos.json`).

### 0.3.39

- Dificultad más alta: los enemigos pasan a tener 25% más de vida.

### 0.3.38

- Sanador y Mago empiezan las peleas con 2 de Ímpetu y ganan Concentrar, que carga +2.
- Para compensar, los enemigos pasan a tener 20% más de vida y pegar 20% más.

### 0.3.37

- Dificultad más alta: los enemigos tienen 10% más de vida y pegan 10% más (`dificultad` en `datos/mazmorra.json`).

### 0.3.36

- Golpes nuevos con efectos de pixelfx, en los tonos de cada zona: tajo, estocada, golpe seco y crítico.
- La pelea se congela un instante al impactar.

### 0.3.35

- El nivel máximo sube 10 por zona, rumbo a 90 en la zona 9.
- El roadmap pasa a 9 zonas y suma las runas.

### 0.3.34

- Armadura Vacía: contorno limpio mientras levanta la espada.

### 0.3.33

- Armadura Vacía: la espada se mueve entera, sin pedazos sueltos.

### 0.3.32

- Armadura Vacía: el cuerpo ya no queda con un hueco al levantar la espada.

### 0.3.31

- Animaciones de ataque por partes para los cuatro enemigos nuevos de Los Salones.

### 0.3.30

- Cuatro enemigos nuevos en Los Salones: Armadura Vacía, Retrato Viviente, Dama de Compañía y Copero Hinchado.

### 0.3.29

- El ícono de presa pasa a ser una mira.

### 0.3.28

- Íconos de estado: blanco rojo para la presa, flecha azul para debilitado y flecha roja para los bonus propios.

### 0.3.27

- Íconos de estado: calavera verde para el veneno, gota para el sangrado y estrellas para el aturdimiento.

### 0.3.26

- Los enemigos usan su habilidad en su primer turno, y más seguido después.

### 0.3.25

- Los estados del grupo se muestran sólo con íconos, sin mensajes.

### 0.3.24

- Cada enemigo tiene su habilidad propia: veneno, sangrado, ráfagas, robo de vida, debilidad, aturdimiento y más (`habilidades` en `datos/enemigos.json`).

### 0.3.23

- Línea de tiempo: aliados en azul y enemigos en rojo, en todos los pisos.

### 0.3.22

- Dibujo y animación propios del Perro Gris.

### 0.3.21

- Piso 2: adornos propios de pared, piso y techo, y armadura nueva.

### 0.3.20

- El Cazador Gris se enfurece al 50%: ojos rojos, invoca perros, engancha a un personaje y marca una presa.

### 0.3.19

- Fondo de batalla de Los Salones: el piso sube para que los enemigos apoyen, y El Cazador Gris se ve un poco más chico.

### 0.3.18

- Peleas de prueba: usan la paleta y el fondo del piso elegido.

### 0.3.17

- Vampyrum Caede como tema de El Cazador Gris.

### 0.3.16

- Modo prueba: "Explorar de prueba" lleva directo a cualquier nivel de cualquier piso.

### 0.3.15

- Piso 2: muros, piso y techo propios, escenario de batalla, y El Cazador Gris con dibujo nuevo y animación.

### 0.3.14

- La música de exploración del piso 1 pasa a ser The Mason's Lament.

### 0.3.13

- Música de exploración para el piso 1, más baja y con el ritmo suavizado (`tools/suavizar_ritmo.py`).

### 0.3.12

- La antorcha usa la simulación de fuego de la fogata del Hogar.

### 0.3.11

- Menú de pelea: el costo vuelve abajo del nombre y las habilidades tienen color propio.

### 0.3.10

- Menú de pelea en dos filas: Atacar, Defender y Poción arriba, las habilidades abajo.

### 0.3.9

- Se pelea contra el enemigo encontrado en el mapa: va al centro, acompañado por otros del piso.

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
