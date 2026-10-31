# Publicar en Steam — guía paso a paso

El juego ya está preparado: guarda en archivos, funciona sin conexión y tiene un puente con Steamworks
que se activa solo cuando hay un App ID. Esto es lo que falta hacer del lado de Steam.

## 1. Cuenta y App ID
1. Crear la cuenta en **Steamworks** (partner.steamgames.com) y pagar el Steam Direct (USD 100 por juego).
2. Steam te asigna un **App ID** (un número).

## 2. Conectar el juego con Steam
1. Instalar la librería: `npm install steamworks.js`
2. Crear un archivo `steam_appid.txt` en la raíz del proyecto con el App ID (para probar sin App ID propio
   se puede usar `480`, el juego de ejemplo de Valve).
3. Sumar `"steam_appid.txt"` a la lista `build.files` de `package.json`.
4. Con Steam abierto, `npm start`: el juego detecta Steam y empieza a enviar logros y puntuaciones.
   Sin `steam_appid.txt` o sin la librería, todo sigue funcionando como ahora (logros y récords locales).

> El puente (`ipc.js` + `preload.js` + `STEAM` en `js/store.js`) **no se probó con Steam real** porque
> todavía no hay App ID. Probarlo con `480` antes de configurar todo lo demás.

## 3. Logros (Steamworks → Stats & Achievements)
Crear estos logros con exactamente estos nombres de API (el juego los envía así):

| API name | Nombre | Cómo se gana |
|---|---|---|
| ACH_PRIMERA | La Llama Perdura | Ganar una partida |
| ACH_INTACTO | Intacto | Ganar sin perder ninguna llama |
| ACH_LEYENDA | Leyenda | Ganar con tres desafíos activos |
| ACH_REGICIDA | Regicida | Vencer al Rey del Osario |
| ACH_CAZADO | El Cazador Cazado | Vencer al Cazador Gris |
| ACH_RELICARIO | Relicario Viviente | Llevar cinco reliquias en una partida |
| ACH_LAPIDARIO | Lapidario | Encontrar seis runas en una partida |
| ACH_TINIEBLAS | Hijo de las Tinieblas | Caminar 60 pasos a oscuras en una partida |
| ACH_MATARIFE | Matarife | Vencer a 100 criaturas en una partida |
| ACH_NEGOCIO | Buen Negocio | Vender diez objetos al Mercader de Huesos |
| ACH_DEVOTO | Devoto | Despertar todo el Altar |
| ACH_CAMINOS | Todos los Caminos | Descubrir todos los finales |

Los logros ganados antes de conectar Steam se envían solos la próxima vez que se abre el juego.

## 4. Tablas de puntuación (Leaderboards)
El juego crea y usa dos tipos de tabla (descendentes, se queda la mejor puntuación de cada jugador):
- `puntuacion` — todas las partidas.
- `diaria-AAAA-MM-DD` — una por día, para la Expedición diaria.

## 5. Steam Cloud
En Steamworks → Steam Cloud, habilitar Auto-Cloud con esta ruta (Windows):
- Raíz: `WinAppDataRoaming` · Subcarpeta: `la-ultima-llama/saves` · Patrón: `*.json`
  (es el nombre interno de la app en `package.json`; si se cambia, cambia la carpeta y hay que actualizar esto)

Ahí quedan el perfil (Ceniza, desbloqueos, códice, récords), las opciones y las partidas guardadas.

## 6. Armar y subir la versión
1. `npm run dist` → genera `dist/win-unpacked/` con `La Ultima Llama.exe`.
2. Con el **SteamPipe** (Steamworks SDK → `tools/ContentBuilder`), apuntar el depot de Windows a esa
   carpeta y subir con `steamcmd +login <usuario> +run_app_build ..\scripts\app_build_<AppID>.vdf +quit`.
3. En Steamworks, poner el build en la rama `default` y publicar.

## 7. Lo que conviene revisar antes de publicar
- Probar con mando (Steam Deck): el juego ya responde a D-pad, A/B/X/Y, LB/RB y Start.
- Página de la tienda: cápsulas, capturas y tráiler (las capturas pueden salir del propio juego en F11).
- La traducción al inglés está empezada (menús, panel, combate), pero los textos del contenido
  (eventos, objetos, registro) siguen en español: terminarla antes de publicar en inglés.
