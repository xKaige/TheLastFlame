'use strict';
// Almacenamiento: en Electron, archivos JSON en la carpeta de datos del juego (lo que sincroniza
// Steam Cloud); en el navegador, localStorage. El resto del juego usa siempre STORE.get/set/remove.

// Modo prueba (`npm run prueba`, o ?prueba en la dirección del navegador): el menú Pruebas del título,
// y lo guardado va aparte de la partida de verdad (ver abajo); Steam no se entera.
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

// En modo prueba se guarda aparte (claves "prueba_…"): queda entre sesiones sin tocar la partida de verdad.
// Mientras no se guardó nada de prueba, se lee lo de verdad; lo borrado en prueba queda marcado.
if (PRUEBA) {
  const real = { get: STORE.get, set: STORE.set, remove: STORE.remove }, BORRADO = '__borrado__', clave = k => 'prueba_' + k;
  STORE.get = k => { const v = real.get(clave(k)); return v === BORRADO ? null : v !== null ? v : real.get(k); };
  STORE.set = (k, v) => real.set(clave(k), v);
  STORE.remove = k => { real.set(clave(k), BORRADO); };
}

// Steam (si el juego corre en Electron con steamworks.js): logros y tablas. Si no, no hace nada.
const STEAM = {
  achievement: id => { if (window.steam && !PRUEBA) window.steam.achievement('ACH_' + id.toUpperCase()); },
  score: (board, score) => { if (window.steam && !PRUEBA) window.steam.score(board, score); },
};
