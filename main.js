// Envoltorio de escritorio (Electron) para distribuir en Steam
const { app, BrowserWindow, ipcMain, net, protocol, screen } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
require('./ipc'); // guardado en archivos y Steam

// ---------- Archivos del juego ----------
// El juego lee sus datos y analiza sus imágenes píxel por píxel, y Chromium no deja hacer eso desde file://.
// Por eso se sirve con un protocolo propio, sin red: sólo entrega archivos de la carpeta del juego.
protocol.registerSchemesAsPrivileged([{ scheme: 'juego', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
function servirJuego() {
  protocol.handle('juego', req => {
    const ruta = path.normalize(path.join(__dirname, decodeURIComponent(new URL(req.url).pathname)));
    if (ruta !== __dirname && !ruta.startsWith(__dirname + path.sep)) return new Response('', { status: 403 });
    return net.fetch(pathToFileURL(ruta).toString());
  });
}

// ---------- Modo de pantalla ----------
// ventana: con bordes, redimensionable · completa: pantalla completa nativa (tapa la barra de tareas)
// sinBordes: ventana sin bordes del tamaño exacto del monitor (cambiar de programa es instantáneo).
// Los bordes no se pueden sacar ni poner a una ventana abierta: pasar a/desde "sinBordes" crea una
// ventana nueva, y el juego retoma la partida en curso (ver display:resume).
const MODES = ['ventana', 'completa', 'sinBordes'];
const settingsFile = () => path.join(app.getPath('userData'), 'saves', 'laultimallama.opciones.json');
function savedMode() {
  try { const m = JSON.parse(fs.readFileSync(settingsFile(), 'utf8')).display; return MODES.includes(m) ? m : 'ventana'; }
  catch (err) { return 'ventana'; }
}

let win = null, mode = 'ventana', resume = null, lastBounds = null;

// ---------- Ventana ----------
function createWindow(m) {
  const borderless = m === 'sinBordes';
  // el monitor donde estaba la ventana anterior (o el principal)
  const display = win ? screen.getDisplayMatching(win.getBounds()) : screen.getPrimaryDisplay();
  const opts = {
    // el tamaño es el del área de juego (sin bordes): 1440×810 = 480×270 a escala ×3 exacta
    useContentSize: true,
    width: 1440,
    height: 810,
    minWidth: 960,
    minHeight: 540,
    show: false,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    title: 'La Última Llama',
    fullscreen: m === 'completa',
    webPreferences: { contextIsolation: true, nodeIntegration: false, preload: path.join(__dirname, 'preload.js') },
  };
  if (borderless) {
    const b = display.bounds;
    Object.assign(opts, { frame: false, resizable: false, maximizable: false, useContentSize: false, minWidth: 0, minHeight: 0, x: b.x, y: b.y, width: b.width, height: b.height });
  } else if (lastBounds) Object.assign(opts, { useContentSize: false, ...lastBounds });
  const w = new BrowserWindow(opts);
  w.setMenuBarVisibility(false);
  // se recuerda dónde estaba la ventana con bordes para volver a ella
  const remember = () => { if (mode === 'ventana' && !w.isFullScreen() && !w.isMinimized()) lastBounds = w.getBounds(); };
  w.on('resize', remember);
  w.on('move', remember);
  // `npm run prueba`: abre el juego en modo prueba (sin guardar nada)
  w.loadURL('juego://local/index.html' + (process.argv.includes('--prueba') ? '?prueba=1' : ''));
  return w;
}

function open(m, after) {
  const old = win;
  mode = m;
  win = createWindow(m);
  win.once('ready-to-show', () => {
    win.show();
    if (mode === 'sinBordes') {
      // al crearla, Windows la recorta al área de trabajo (sin la barra de tareas): se agranda después
      win.setBounds(screen.getDisplayMatching(win.getBounds()).bounds);
      win.focus();
    }
    if (old && !old.isDestroyed()) old.destroy();
    if (after) after();
  });
}

ipcMain.on('display:mode', e => { e.returnValue = mode; });
ipcMain.on('display:set', (e, m, state) => {
  e.returnValue = true;
  if (!MODES.includes(m) || m === mode) return;
  // entre ventana y pantalla completa alcanza con cambiar el estado de la misma ventana
  if (m !== 'sinBordes' && mode !== 'sinBordes') {
    mode = m;
    win.setFullScreen(m === 'completa');
    return;
  }
  resume = state || '{}';
  open(m);
});
// la ventana nueva pregunta si tiene que retomar algo (una sola vez)
ipcMain.on('display:resume', e => { e.returnValue = resume; resume = null; });

app.whenReady().then(() => { servirJuego(); open(savedMode()); });
app.on('window-all-closed', () => app.quit());
