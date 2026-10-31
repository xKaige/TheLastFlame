'use strict';
// Cinemáticas de los finales: una por cada final elegido, con el mismo motor que la introducción
// (js/cinematic.js). Todas abren igual (el rey se deshace, la cámara de la Llama) y después se separan.
// Se ven al elegir el final, antes del epitafio, y se pueden volver a ver desde el Códice.

// ---------- Arte ----------
function buildEndingArt() {
  const A = {};
  // La Cámara de la Llama: caverna, el cuenco de piedra apagado al centro
  A.camara = sceneArt(480, 270, 'engrave', g => {
    vgrad(g, 0, 0, 480, 270, [[0, 0.02], [1, 0.12]]);
    for (let k = 0; k < 16; k++) {
      const x = hash2(k, 1, 21) * 480, w = 10 + hash2(k, 2, 21) * 26, h = 30 + hash2(k, 3, 21) * 70;
      poly(g, [[x - w, 0], [x + w, 0], [x + 2, h]], 0.06 + hash2(k, 4, 21) * 0.05, 0);
    }
    g.beginPath(); g.moveTo(0, 232);
    for (let x = 0; x <= 480; x += 12) g.lineTo(x, 226 + (hash2(x, 5, 21) - 0.5) * 8);
    g.lineTo(480, 270); g.lineTo(0, 270); g.closePath(); g.fillStyle = G(0.1); g.fill();
    glow(g, 330, 150, 150, 0.3);
    // cuenco sobre su pedestal, con ceniza fría (alto, para que la banda del texto no lo tape)
    poly(g, [[310, 236], [350, 236], [342, 150], [318, 150]], 0.34, 1);
    for (let k = 0; k < 4; k++) line(g, 312, 168 + k * 18, 348, 168 + k * 18, 1, 0.22);
    poly(g, [[276, 150], [384, 150], [366, 122], [294, 122]], 0.5, 1);
    ell(g, 330, 122, 36, 6, 0.2, 1);
    for (let k = 0; k < 16; k++) ell(g, 302 + k * 3.6, 121 + hash2(k, 6, 21) * 2, 2, 1, 0.55, 0);
    for (let k = 0; k < 6; k++) line(g, 284 + k * 18, 134, 286 + k * 18, 144, 0.8, 0.66);
  }, (x, y, v) => v + (fbm(x / 30, y / 30, 21) - 0.5) * 0.08);

  // La escalera: un pozo que sube en zigzag (se recorre de abajo hacia arriba)
  A.escalera = sceneArt(480, 560, 'crypt', g => {
    g.fillStyle = G(0.04); g.fillRect(0, 0, 480, 560);
    for (let y = 0; y < 560; y += 12)
      for (let x = ((y / 12) % 2) * 14; x < 480; x += 28) { g.fillStyle = G(0.08 + hash2(x, y, 31) * 0.06); g.fillRect(x + 1, y + 1, 26, 10); }
    for (const [x0, y0, x1, y1] of ENDING_STAIRS) {
      const n = 14;
      for (let k = 0; k < n; k++) {
        const x = lerp(x0, x1, k / n), y = lerp(y0, y1, k / n);
        g.fillStyle = G(0.2 + k * 0.006); g.fillRect(Math.round(x) - 14, Math.round(y), 30, 7);
        g.fillStyle = G(0.34); g.fillRect(Math.round(x) - 14, Math.round(y), 30, 1);
      }
    }
    // arriba, una abertura con luz gris
    g.fillStyle = G(0.4); g.beginPath(); g.moveTo(206, 40); g.lineTo(206, 18); g.arc(240, 18, 34, Math.PI, 0); g.lineTo(274, 40); g.fill();
    glow(g, 240, 20, 90, 0.25);
  });

  // Amanecer sobre Vel'Ombra: el sol asoma detrás de la montaña
  A.amanecer = sceneArt(560, 270, 'castle', g => {
    vgrad(g, 0, 0, 560, 270, [[0, 0.16], [0.45, 0.5], [0.7, 0.78], [1, 0.62]]);
    glow(g, 330, 140, 220, 0.55);
    for (let k = 0; k < 9; k++) line(g, 330, 132, 330 + Math.cos(Math.PI + k * Math.PI / 8) * 300, 132 + Math.sin(Math.PI + k * Math.PI / 8) * 300, 3, 0.62);
    ell(g, 330, 132, 30, 30, 0.99, 0);
    g.beginPath(); g.moveTo(40, 270); g.lineTo(170, 178); g.lineTo(230, 152); g.lineTo(272, 128); g.lineTo(330, 126);
    g.lineTo(380, 150); g.lineTo(450, 172); g.lineTo(560, 270); g.closePath();
    g.fillStyle = G(0.2); g.fill();
    castleSil(g, 300, 132, 0.5, 0.14, false);
    houses(g, 0, 560, 252, 1, 0.22, false, 1);
    houses(g, -10, 560, 272, 1.35, 0.14, false, 2);
  });

  // El trono vacío del rey caído
  A.trono = sceneArt(480, 270, 'blood', g => {
    vgrad(g, 0, 0, 480, 270, [[0, 0.02], [1, 0.07]]);
    glow(g, 240, 120, 170, 0.32);
    for (let k = 0; k < 4; k++) { g.fillStyle = G(0.18 + k * 0.04); g.fillRect(150 + k * 14, 226 - k * 10, 180 - k * 28, 10 + k * 10 + 34); }
    poly(g, [[196, 196], [284, 196], [278, 120], [202, 120]], 0.3, 1);
    poly(g, [[204, 124], [276, 124], [272, 40], [260, 22], [240, 8], [220, 22], [208, 40]], 0.4, 1);
    poly(g, [[184, 196], [208, 196], [208, 140], [184, 146]], 0.46, 1);
    poly(g, [[272, 196], [296, 196], [296, 146], [272, 140]], 0.46, 1);
    for (let k = 0; k < 5; k++) poly(g, [[214 + k * 13, 42], [219 + k * 13, 24 - (k === 2 ? 8 : 0)], [224 + k * 13, 42]], 0.6, 0);
    // la oscuridad trepa hacia el asiento vacío
    for (let k = 0; k < 10; k++) curve(g, [[hash2(k, 1, 41) * 480, 270], [hash2(k, 2, 41) * 480, 220], [240 + (hash2(k, 3, 41) - 0.5) * 220, 200], [240 + (hash2(k, 4, 41) - 0.5) * 80, 150]], 0.8, 0.04);
  });

  // La hoguera de la aldea: los viejos cuentan la historia (alto, para que el texto no tape la ronda)
  A.hoguera = sceneArt(480, 270, 'castle', g => {
    vgrad(g, 0, 0, 480, 270, [[0, 0.03], [0.5, 0.09], [1, 0.16]]);
    for (let k = 0; k < 40; k++) { g.fillStyle = G(0.6 + hash2(k, 3, 51) * 0.4); g.fillRect(Math.round(hash2(k, 1, 51) * 480), Math.round(hash2(k, 2, 51) * 70), 1, 1); }
    houses(g, 0, 480, 116, 1.3, 0.08, true, 5);
    g.fillStyle = G(0.12); g.fillRect(0, 116, 480, 154);
    glow(g, 240, 168, 160, 0.55);
    // ronda alrededor del fuego: un viejo de pie y chicos sentados
    const sit = (x, y, s) => { ell(g, x, y - 18 * s, 5 * s, 5.5 * s, 0.04, 0); poly(g, [[x - 9 * s, y], [x - 6 * s, y - 13 * s], [x + 6 * s, y - 13 * s], [x + 9 * s, y]], 0.04, 0); };
    for (const [x, y, s] of [[150, 196, 1.3], [186, 212, 1.5], [298, 212, 1.5], [334, 196, 1.3], [124, 176, 1.05], [360, 176, 1.05]]) sit(x, y, s);
    poly(g, [[392, 214], [387, 140], [400, 126], [413, 140], [410, 214]], 0.04, 0);
    ell(g, 400, 116, 8, 9, 0.04, 0);
    line(g, 420, 214, 425, 122, 2.4, 0.06);
    line(g, 386, 150, 368, 132, 3, 0.04);
    for (let k = 0; k < 6; k++) line(g, 222 + k * 7, 184, 258 - k * 6, 174, 2, 0.22);
  });
  return A;
}

// Tramos de la escalera (x0, y0 → x1, y1), de abajo hacia arriba; la antorcha los recorre
const ENDING_STAIRS = [[120, 540, 360, 440], [360, 440, 120, 330], [120, 330, 360, 220], [360, 220, 120, 110], [120, 110, 240, 40]];

// ---------- Guiones ----------
// Todas abren igual: el rey se deshace y queda la cámara con el cuenco apagado
function endingIntro() {
  return [
    { art: 'rojo', ramp: 'blood', pan: [0, 0, 0, 0], sprite: ['boss', 'blood', 220], spriteFade: true, sfx: 'snuff', lines: [
      'El Que Habita la Oscuridad se deshace como ceniza fría.',
      'Lo que fue Aldemar el Insomne no grita. Se apaga, como se apagó la Llama.'] },
    { art: 'camara', ramp: 'engrave', pan: [0, 0, 0, 0], hero: [null, 150, 150], lines: [
      'En el fondo del pozo queda el cuenco de piedra donde ardió la Llama Primera.',
      'Tu antorcha es lo único que brilla. La chispa tiembla, como si reconociera su casa.'] },
  ];
}

function endingScenes(id, who) {
  const climb = { art: 'escalera', ramp: 'crypt', pan: [0, 290, 0, 0], climb: true, sfx: 'stairs' };
  const S_ = {
    luz: [
      { ...climb, lines: [
        'No la dejas aquí abajo. La cubres con la mano y empiezas a subir.',
        'Piso por piso, la cripta te ve pasar: los osarios, los salones del castillo, las cavernas sin nombre.',
        'Las sombras se apartan del camino. Ninguna se atreve a tocarla.'] },
      { art: 'amanecer', ramp: 'castle', pan: [80, 0, 0, 0], dawn: true, lines: [
        'Arriba, Vel’Ombra sigue a oscuras, como hace siglos.',
        'Levantas la antorcha. Y el cielo, detrás de la montaña, empieza a aclarar.',
        'Por primera vez en siglos, alguien ve amanecer.',
        { big: 'La Llama Perdura' }] },
    ],
    trono: [
      { art: 'trono', ramp: 'blood', pan: [0, 0, 0, 0], sfx: 'whisper', lines: [
        'Al fondo de la cámara hay un trono. Está vacío.',
        'La oscuridad no soporta un trono vacío. Ya busca quién lo ocupe.',
        { q: 'Siéntate. Ya caminaste demasiado. La oscuridad es tibia.' }] },
      { art: 'camara', ramp: 'engrave', pan: [0, 0, 0, 0], hero: [null, 150, 150], heroSnuff: 1, lines: [
        'Miras tu antorcha por última vez.',
        'Y la apagas con tus propios dedos.',
        'La Sombra tenía razón en una sola cosa: tenía que ser por tu voluntad.'] },
      { art: 'trono', ramp: 'blood', pan: [0, 0, 0, 0], hero: [null, 170, 240, true], sfx: 'encounter', lines: [
        'Te sientas donde él se sentaba. La oscuridad te reconoce.',
        'Ahora eres tú quien espera en el fondo del pozo.',
        'Y cuando una luz baje por la escalera, sabrás exactamente qué decirle:',
        { q: 'Otra lucecita bajando a mi cripta...' },
        { big: 'El Nuevo Habitante' }] },
    ],
    relicario: [
      { art: 'llama', ramp: 'castle', pan: [0, 150, 0, 150], flame: [240, 393, 96, 150], flameK: [0.25, 1], orbs: true, sfx: 'oil', lines: [
        'Sacas las reliquias una por una y las dejas caer en el cuenco.',
        'Cada una cargaba una maldición. Juntas, recuerdan el fuego del que salieron.',
        'Tu chispa salta tras ellas. La Llama Primera vuelve a encenderse.'] },
      { art: 'reino', ramp: 'castle', pan: [0, 0, 80, 0], lines: [
        'Lo que se apaga no es la luz: es la maldición que la encerraba aquí abajo.',
        'Las chimeneas de Vel’Ombra vuelven a echar humo tibio. Las sombras se acortan.',
        { big: 'El Relicario Viviente' }] },
    ],
    leyenda: [
      { ...climb, lines: [
        'Bajaste con todo en contra. Y volviste igual.',
        'Nadie te espera arriba. Nadie creía que fuera posible.'] },
      { art: 'hoguera', ramp: 'castle', pan: [0, 0, 0, 0], flame: [240, 182, 48, 80], sfx: 'fire', lines: [
        'Años después, en las aldeas de la ladera, los viejos juntan a los chicos alrededor del fuego.',
        'Cuentan de alguien que bajó a la Cripta de Vel’Ombra sin ninguna ventaja,',
        'que venció al rey caído y subió con la antorcha todavía encendida.',
        'Su nombre se dice en voz baja, como una plegaria:',
        { big: who.name }] },
    ],
  };
  return [...endingIntro(), ...S_[id]];
}

// ---------- Efectos propios de los finales (los llama drawCine) ----------
function drawEndingFx(ctx, sc, R, ox, oy, t, e) {
  // la antorcha sube por la escalera
  if (sc.climb) {
    const n = ENDING_STAIRS.length, f = clamp(e * 1.08, 0, 1) * n, i = Math.min(n - 1, f | 0), k = f - i;
    const [x0, y0, x1, y1] = ENDING_STAIRS[i];
    const x = lerp(x0, x1, k) + ox, y = lerp(y0, y1, k) + oy - 4;
    ditherFill(ctx, x - 1, y - 6, 3, 8, 1, R[2]);
    drawFlame(ctx, x, y - 4, 16, 26, t, 0.8, sc.ramp);
  }
  // el cielo se aclara de a poco
  if (sc.dawn) ditherFill(ctx, 0, 0, W, H, clamp(0.85 - CINE.t / 9, 0, 0.85), R[0]);
  // las reliquias caen en espiral dentro del cuenco
  if (sc.orbs) {
    const cx = sc.flame[0] + ox, by = sc.flame[1] + oy - 10, p = CINE.t / sc.total;
    for (let i = 0; i < 5; i++) {
      const a0 = 0.08 + i * 0.07, q = clamp((p - a0) / 0.22, 0, 1);
      if (q >= 1) continue;
      const ang = i * 1.26 + q * 5, r = 90 * (1 - q);
      const x = Math.round(cx + Math.cos(ang) * r), y = Math.round(by - 120 * (1 - q) + Math.sin(ang) * r * 0.3);
      ctx.fillStyle = R[4]; ctx.fillRect(x - 3, y - 1, 7, 3); ctx.fillRect(x - 1, y - 3, 3, 7);
      ctx.fillStyle = R[5]; ctx.fillRect(x - 1, y - 1, 3, 3);
      ctx.fillStyle = R[3];
      for (let j = 1; j < 7; j++) ctx.fillRect(Math.round(x - Math.cos(ang) * j * 2), Math.round(y + j * 3), 1, 1);
    }
  }
}

// ---------- Reproducción ----------
// El héroe que protagoniza: el de la partida en curso, o (desde el Códice) el último que llegó a ese final
function partyHero() { return { cls: P.cls, race: P.race, look: lookOf(P.equip), name: P.name }; }
function codexHero(id) {
  const h = PROFILE.history.find(x => x.ending === id) || PROFILE.history.find(x => x.won) || {};
  const cls = h.cls || CR.cls;
  return { cls, race: h.race || CR.race, look: kitLook(cls), name: h.name || CR.name };
}

function playEnding(id, onDone, who) {
  if (!CINE.endArt) { CINE.endArt = true; if (!CINE.art) CINE.art = buildCineArt(); Object.assign(CINE.art, buildEndingArt()); }
  playCine(endingScenes(id, who), onDone, who, 'final_' + id, id === 'trono' ? 'final' : 'intro');
}
