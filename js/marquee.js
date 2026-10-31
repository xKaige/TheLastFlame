'use strict';
// Textos que no entran en su renglón: se desplazan de derecha a izquierda como un cartel (ida y vuelta).
// Un observador revisa el escenario cada vez que cambia y envuelve sólo lo que de verdad se corta.

const MARQUEE_SEL = '#cAttrs .ax, #menu .ml, #menu .ms, .opt .ol, #foeTags, #inv .iname, #stName .nm, #create .chip, #log .line:last-child';

function marquee() {
  for (const el of document.querySelectorAll(MARQUEE_SEL)) {
    if (el.firstElementChild && el.firstElementChild.classList.contains('mqi')) continue;
    const over = el.scrollWidth - el.clientWidth;
    if (over <= 1 || !el.clientWidth) continue;
    el.innerHTML = `<span class="mqi">${el.innerHTML}</span>`;
    const span = el.firstElementChild;
    span.style.setProperty('--mq', `-${over + 3}px`);
    const dur = +(3 + over / 14).toFixed(1);
    span.style.animationDuration = `${dur}s`;
    el.classList.add('mq');
    // el recorrido va atado al reloj de la página: si el renglón se vuelve a dibujar (al moverse por
    // el inventario o un menú), el texto sigue donde estaba en vez de volver al principio
    for (const a of span.getAnimations ? span.getAnimations() : []) a.startTime = 0;
  }
}

let marqueeQueued = false;
const marqueeWatch = new MutationObserver(() => {
  if (marqueeQueued) return;
  marqueeQueued = true;
  setTimeout(() => { marqueeQueued = false; marquee(); }, 30);
});
marqueeWatch.observe(document.getElementById('stage'), { childList: true, subtree: true });
// los paneles que aparecen al cambiar de modo (antes ocultos, sin medida) se revisan de a ratos
setInterval(marquee, 400);
