# Habilidades (borrador para la 0.6.0)

Propuesta para revisar. Todavía no está en el juego, y los números se ajustan al probarlos.

## Reglas

- Cada clase tiene 8 habilidades y lleva 4.
- Las habilidades suben del nivel 1 al 10 por acumulación, y cada personaje tiene la suya.
- Cada nivel suma 10% de poder.
- En el nivel 5 y en el nivel 10 la habilidad se transforma.
- Tope por zona: el nivel máximo es la zona + 1. Zona 1 llega a nivel 2, zona 4 a nivel 5, y zona 9 a nivel 10.
- Al llegar al tope, la acumulación se detiene hasta bajar a la zona siguiente.
- Lo que hace falta para pasar del nivel N al siguiente es la meta base × N².
- Cada habilidad escala con su atributo, además de con su nivel.

| Pasar a nivel | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|
| Veces la meta base | 1 | 4 | 9 | 16 | 25 | 36 | 49 | 64 | 81 |
| Zona necesaria | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |

## Guerrero (Fuerza y Vitalidad)

Muchas pasivas y pocas activas, pero devastadoras.

| Habilidad | Tipo | Efecto base | Acumula | Meta base | Nivel 5 | Nivel 10 |
|---|---|---|---|---|---|---|
| Provocar | ◆ | 2 turnos atrae ataques, con 30% de contraatacar | Contraataques | 10 | Dura 3 turnos | Contraataca siempre |
| Golpe Brutal | ◆◆ | Daño ×2 y sangrado | Usos | 10 | Sangrado doble | Ignora la defensa |
| Quebrantar | ◆◆ | Daño ×1,2 y −30% de defensa enemiga por 3 turnos | Usos | 10 | También debilita | Alcanza a todos |
| Golpe Final | ◆ a ◆◆◆ | Gasta todo el Ímpetu: daño ×1,5 por punto | Ímpetu gastado | 30 | Mata enemigos bajo 15% de vida | Devuelve 1 de Ímpetu al matar |
| Piel de Hierro | Pasiva | Recibe 6% menos de daño | Daño recibido | 150 | Inmune al sangrado | Inmune a críticos |
| Represalia | Pasiva | 25% de ganar 1 de Ímpetu al recibir un golpe | Golpes recibidos | 30 | 50% de chance | También con golpes esquivados |
| Último Aliento | Pasiva | Hasta +75% de daño con poca vida | Golpes con menos de 50% de vida | 15 | También suma defensa | Sobrevive una vez por pelea con 1 de vida |
| Muro Viviente | Pasiva | Con más vida que el resto, el grupo recibe 8% menos de daño | Daño evitado | 100 | Cubre también golpes a todos | Se le suma su defensa al grupo |

## Pícaro (Destreza y Perspicacia)

Prepara y remata. Pega fuerte a quien ya tiene un estado.

| Habilidad | Tipo | Efecto base | Acumula | Meta base | Nivel 5 | Nivel 10 |
|---|---|---|---|---|---|---|
| Puñalada | ◆◆ | Daño ×1,5, ignora la defensa, ×2 si sangra o tiene veneno | Usos | 10 | Crítico seguro con estado | Devuelve 1 de Ímpetu con estado |
| Hoja Envenenada | ◆ | Daño ×0,5 y veneno | Daño de veneno | 60 | Veneno más largo | Salta a otro enemigo |
| Abrir la Herida | ◆◆ | Estalla todo el sangrado | Pilas estalladas | 15 | No gasta el sangrado | Alcanza a todos |
| Danza de Cuchillas | ◆◆◆ | 3 golpes ×0,6 al azar | Usos | 8 | 4 golpes | Prefiere enemigos con estado |
| Polvo en los Ojos | ◆ | El enemigo pierde el turno, no a jefes | Turnos quitados | 8 | Debilita a jefes | Alcanza a todos |
| Paso de Sombra | ◆ | Esquiva seguro el próximo ataque | Golpes esquivados | 15 | Contraataca al esquivar | Dura 2 ataques |
| Sangre Fría | Pasiva | +5% de crítico contra enemigos con estado | Críticos | 25 | Los críticos sangran | Críticos ×2,5 |
| Oportunista | Pasiva | +20% de daño a quien no actuó todavía | Daño extra hecho | 100 | También tras esquivar | Primer golpe de la pelea crítico |

## Mago (Intelecto y Arcano)

Acumula quemaduras y las detona.

| Habilidad | Tipo | Efecto base | Acumula | Meta base | Nivel 5 | Nivel 10 |
|---|---|---|---|---|---|---|
| Llama Arcana | ◆◆ | 14–20 de fuego y quemadura | Daño hecho | 120 | Quemadura más fuerte | Un segundo meteoro |
| Tormenta de Fuego | ◆◆◆ | 9–14 a todos y quemadura | Daño hecho | 150 | Baja la defensa | Una segunda ola menor |
| Lanza Ígnea | ◆◆ | 24–32 a uno (Arcano 16) | Daño hecho | 200 | Ignora la defensa | Atraviesa a dos enemigos |
| Incendio | ◆◆◆ | 16–22 a todos (Arcano 20) | Daño hecho | 250 | Quemaduras más largas | Quema también escudos |
| Brasa Ávida | ◆ | Enciende; si ya ardía, +1 de Ímpetu | Enemigos encendidos | 12 | Da +2 de Ímpetu | Alcanza a todos |
| Detonar | ◆◆ | Consume la quemadura y hace su daño restante ×2 | Daño hecho | 150 | No consume la quemadura | Salta a otros enemigos |
| Muro de Llamas | ◆◆◆ | Los próximos 4 ataques queman al atacante | Quemaduras causadas | 15 | 6 ataques | También reduce el daño |
| Combustión | Pasiva | Las quemaduras hacen 15% más | Daño de quemaduras | 120 | Duran 1 turno más | Al morir un enemigo, estalla |

## Sanador (Intelecto y Fe)

Sostiene y limpia. Sus habilidades grandes piden Fe.

| Habilidad | Tipo | Efecto base | Acumula | Meta base | Nivel 5 | Nivel 10 |
|---|---|---|---|---|---|---|
| Sanar | ◆◆ | Cura 30% a un aliado | Vida curada | 150 | Quita un estado | Levanta a un caído con poca vida |
| Manos Tibias | ◆ | Cura 15% a un aliado | Vida curada | 80 | Da +1 de Ímpetu | Cura el doble bajo 30% de vida |
| Bendición | ◆◆◆ | Cura 15% a todos y +2 de defensa | Vida curada | 200 | +3 de defensa | Quita estados a todos |
| Gracia | ◆◆ | Cura 50% a un aliado (Fe 16) | Vida curada | 250 | Protege del próximo golpe | Cura al grupo a la mitad |
| Milagro | ◆◆◆ | Cura 35% a todos (Fe 20) | Vida curada | 300 | Quita estados | Levanta a los caídos, una vez por pelea |
| Muro de Escudos | ◆◆ | +3 de defensa a todos | Daño evitado | 120 | +4 de defensa | Absorbe el próximo golpe a todos |
| Chispa Prestada | ◆◆ | Da 2 de Ímpetu a un aliado | Ímpetu dado | 20 | Da 3 de Ímpetu | Alcanza a todos |
| Fe Inquebrantable | Pasiva | Al curar, +5% de defensa propia por 2 turnos | Curaciones | 30 | Se aplica al curado | Curar da 1 de Ímpetu |
