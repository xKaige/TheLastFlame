// Lo que el juego usa de pixelfx (https://github.com/patch-gg/pixelfx). Para sumar un efecto, agregarlo acá y volver a armar js/pixelfx.js:
// copiar este archivo a la raíz de pixelfx y correr esbuild pixelfx_entrada.js --bundle --minify --format=iife --global-name=PIXELFX --legal-comments=none --outfile=js/pixelfx.js
export { createFrame, clearFrame, createFx, composite } from './src/core/fx.js';
import * as tajo from './src/fx/melee/sword-slash.js';
import * as estocada from './src/fx/melee/thrust.js';
import * as golpe from './src/fx/impacts/blunt-hit.js';
import * as chispa from './src/fx/impacts/hit-spark.js';
import * as critico from './src/fx/impacts/crit-hit.js';
import * as pilar from './src/fx/fire/flame-pillar.js';
import * as meteoro from './src/fx/fire/meteor.js';
import * as anillo from './src/fx/fire/fire-ring.js';
import * as cura from './src/fx/holy/heal.js';
import * as resurreccion from './src/fx/holy/resurrection.js';
import * as bendicion from './src/fx/holy/blessing.js';
import * as pilar_luz from './src/fx/holy/holy-pillar.js';
import * as escudo from './src/fx/holy/divine-shield.js';
import * as plumas from './src/fx/holy/feather-burst.js';
export const EFECTOS = { tajo, estocada, golpe, chispa, critico, pilar, meteoro, anillo, cura, resurreccion, bendicion, pilar_luz, escudo, plumas };
