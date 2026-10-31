// Canales entre el juego y Electron: guardado en archivos y Steam (los usa main.js)
const { app, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

// ---------- Guardado en archivos ----------
// Cada clave es un .json en <datos de la app>/saves: es la carpeta que se configura en Steam Cloud.
const saveDir = () => path.join(app.getPath('userData'), 'saves');
const saveFile = key => path.join(saveDir(), key.replace(/[^a-z0-9._-]/gi, '_') + '.json');

ipcMain.on('store:read', (e, key) => {
  try { e.returnValue = fs.readFileSync(saveFile(key), 'utf8'); } catch (err) { e.returnValue = null; }
});
ipcMain.on('store:write', (e, key, value) => {
  try {
    fs.mkdirSync(saveDir(), { recursive: true });
    // se escribe aparte y se renombra: un corte de luz no deja un guardado a medias
    const f = saveFile(key);
    fs.writeFileSync(f + '.tmp', value);
    fs.renameSync(f + '.tmp', f);
    e.returnValue = true;
  } catch (err) { e.returnValue = false; }
});
ipcMain.on('store:remove', (e, key) => {
  try { fs.unlinkSync(saveFile(key)); } catch (err) { /* ya no estaba */ }
  e.returnValue = true;
});
ipcMain.on('store:dir', e => { e.returnValue = saveDir(); });

// ---------- Steamworks (opcional) ----------
// Se activa sólo si está instalado steamworks.js y hay un steam_appid.txt junto al juego.
// Sin eso el juego funciona igual; los logros y récords quedan en el perfil local.
let steam = null;
try {
  const appId = Number(fs.readFileSync(path.join(__dirname, 'steam_appid.txt'), 'utf8').trim());
  if (appId) steam = require('steamworks.js').init(appId);
} catch (err) { steam = null; }

ipcMain.on('steam:ok', e => { e.returnValue = !!steam; });
ipcMain.on('steam:achievement', (e, id) => {
  try { if (steam && !steam.achievement.isActivated(id)) steam.achievement.activate(id); } catch (err) { /* logro no configurado en Steam */ }
});
ipcMain.on('steam:score', async (e, board, score) => {
  try {
    const lb = steam && steam.leaderboards;
    if (!lb) return;
    const handle = await lb.findOrCreateLeaderboard(board, 2, 1); // descendente, puntuación numérica
    await lb.uploadScore(handle, score, 1);                       // se queda con la mejor
  } catch (err) { /* sin tablas disponibles */ }
});
