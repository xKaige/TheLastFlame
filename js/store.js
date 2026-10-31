'use strict';
// Almacenamiento: en Electron, archivos JSON en la carpeta de datos del juego (lo que sincroniza
// Steam Cloud); en el navegador, localStorage. El resto del juego usa siempre STORE.get/set/remove.

// Modo prueba (`npm run prueba`, o ?prueba en la dirección del navegador): el menú Pruebas del título,
// y nada se escribe de verdad: partidas, perfil y opciones quedan en memoria; Steam no se entera.
const PRUEBA = /[?&]prueba(=|&|$)/.test(location.search);

const STORE = (() => {
  const native = window.nativeStore;
  const ls = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    remove: k => { try { localStorage.removeItem(k); } catch (e) { /* sin almacenamiento */ } },
  };
  if (!native) return { ...ls, where: null };
  return {
    // lo guardado por versiones anteriores (en localStorage) se pasa a archivo la primera vez
    get: k => {
      const v = native.read(k);
      if (v !== null) return v;
      const old = ls.get(k);
      if (old !== null && native.write(k, old)) ls.remove(k);
      return old;
    },
    set: (k, v) => native.write(k, v),
    remove: k => { native.remove(k); ls.remove(k); },
    where: native.dir,
  };
})();

// En modo prueba se lee lo guardado pero se escribe sólo en memoria (se pierde al cerrar)
if (PRUEBA) {
  const real = { get: STORE.get, set: STORE.set, remove: STORE.remove }, mem = new Map();
  STORE.get = k => (mem.has(k) ? mem.get(k) : real.get(k));
  STORE.set = (k, v) => { mem.set(k, v); return true; };
  STORE.remove = k => { mem.set(k, null); };
}

// Steam (si el juego corre en Electron con steamworks.js): logros y tablas. Si no, no hace nada.
const STEAM = {
  achievement: id => { if (window.steam && !PRUEBA) window.steam.achievement('ACH_' + id.toUpperCase()); },
  score: (board, score) => { if (window.steam && !PRUEBA) window.steam.score(board, score); },
};
