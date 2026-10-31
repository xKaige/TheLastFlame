'use strict';
// Música procedural: un secuenciador programa notas por adelantado (sin cortes aunque
// el juego tarde un cuadro) y los temas se cambian con fundido.
// Temas: intro (título y cinemática), crypt, castle, abyss (uno por piso), boss y final.

const MUSIC = { cur: null, want: null };
const MUSIC_VOL = 0.24;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

function setMusic(name) {
  if (!AC) { MUSIC.want = name; return; }      // todavía no hubo un gesto del jugador
  if (MUSIC.cur && MUSIC.cur.name === name) return;
  if (MUSIC.cur) fadeOutTrack(MUSIC.cur);
  MUSIC.cur = name ? startTrack(name) : null;
}

function startTrack(name) {
  const t = AC.currentTime;
  const out = AC.createGain();
  out.gain.setValueAtTime(0, t);
  out.gain.linearRampToValueAtTime(MUSIC_VOL * (TRACKS[name].vol || 1), t + 2.5);
  out.connect(musicBus);
  // eco compartido por todo el tema: da la sensación de sala de piedra
  const dl = AC.createDelay(); dl.delayTime.value = TRACKS[name].echo || 0.37;
  const fb = AC.createGain(); fb.gain.value = 0.42;
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
  dl.connect(lp).connect(fb).connect(dl);
  lp.connect(out);
  const bus = AC.createGain(); bus.connect(out); bus.connect(dl);
  const st = { name, out, bus, step: 0, next: t + 0.15 };
  st.timer = setInterval(() => tickTrack(st), 120);
  return st;
}

function tickTrack(st) {
  const tr = TRACKS[st.name];
  const dur = 60 / tr.bpm / (tr.div || 1);
  // un segundo de anticipación: aguanta aunque el navegador frene los temporizadores
  while (st.next < AC.currentTime + 1) {
    tr.step(st.step, st.next, st.bus);
    st.step++;
    st.next += dur;
  }
}

function fadeOutTrack(st) {
  const t = AC.currentTime;
  st.out.gain.cancelScheduledValues(t);
  st.out.gain.setValueAtTime(st.out.gain.value, t);
  st.out.gain.linearRampToValueAtTime(0, t + 1.8);
  clearInterval(st.timer);
  setTimeout(() => st.out.disconnect(), 3000);
}

// ---------- Instrumentos ----------
function voice(dest, type, f, t, dur, vol, { attack = 0.02, release = 0.3, cutoff = 2000, detune = 0 } = {}) {
  const o = AC.createOscillator(), g = AC.createGain(), lp = AC.createBiquadFilter();
  o.type = type; o.frequency.value = f; o.detune.value = detune;
  lp.type = 'lowpass'; lp.frequency.value = cutoff;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.setValueAtTime(vol, t + Math.max(attack, dur - release));
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(lp).connect(g).connect(dest);
  o.start(t); o.stop(t + dur + 0.05);
}

const pad = (dest, notes, t, dur, vol, cutoff = 900, type = 'sawtooth') => {
  for (const m of notes) for (const det of [-6, 6])
    voice(dest, type, mtof(m), t, dur, vol, { attack: dur * 0.3, release: dur * 0.35, cutoff, detune: det });
};

function pluck(dest, m, t, vol, decay = 1.4, type = 'triangle') {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.value = mtof(m);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  o.connect(g).connect(dest); o.start(t); o.stop(t + decay + 0.05);
}

function bell(dest, m, t, vol, decay = 3) {
  for (const [ratio, v] of [[1, 1], [2.76, 0.4], [5.4, 0.15]]) {
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = 'sine'; o.frequency.value = mtof(m) * ratio;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * v, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay / ratio);
    o.connect(g).connect(dest); o.start(t); o.stop(t + decay + 0.05);
  }
}

function drum(dest, t, vol, f0 = 110, f1 = 38, dur = 0.35) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.05);
}

function hiss(dest, t, vol, dur, type = 'highpass', f = 3000, fEnd = 0, q = 0.8) {
  const n = AC.createBufferSource(), flt = AC.createBiquadFilter(), g = AC.createGain();
  n.buffer = noise;
  flt.type = type; flt.frequency.setValueAtTime(f, t); flt.Q.value = q;
  if (fEnd) flt.frequency.exponentialRampToValueAtTime(fEnd, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.01, dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  n.connect(flt).connect(g).connect(dest); n.start(t, Math.random() * 0.5); n.stop(t + dur + 0.05);
}

// ---------- Temas ----------
const TRACKS = {
  // Título y cinemática: acordes oscuros con bajo y campanas
  intro: {
    bpm: 40, div: 1,
    step(i, t, d) {
      const chords = [[62, 65, 69], [58, 62, 65], [55, 58, 62], [57, 61, 64]];
      if (i % 4 === 0) {
        const ch = chords[(i / 4) % 4];
        pad(d, ch, t, 7.6, 0.035, 850);
        voice(d, 'sine', mtof(ch[0] - 24), t, 7.6, 0.2, { attack: 1.5, release: 2 });
      }
      if (i % 4 === 1 || i % 4 === 3) bell(d, [74, 77, 81, 76][(i >> 1) % 4], t, 0.05, 2.6);
    },
  },

  // Piso I: casi silencio, arpegio pulsado en re menor y gotas de agua
  crypt: {
    bpm: 66, div: 2, vol: 0.9,
    step(i, t, d) {
      if (i % 32 === 0) {
        voice(d, 'triangle', mtof(38), t, 14.8, 0.16, { attack: 3, release: 4, cutoff: 400 });
        voice(d, 'triangle', mtof(45), t, 14.8, 0.09, { attack: 4, release: 4, cutoff: 400 });
      }
      const mel = [62, 0, 65, 0, 69, 0, 0, 0, 67, 0, 65, 0, 64, 0, 0, 0, 62, 0, 57, 0, 58, 0, 0, 0, 57, 0, 0, 0, 0, 0, 0, 0];
      const m = mel[i % 32];
      if (m) pluck(d, m, t, 0.07, 2.2);
      if (Math.random() < 0.05) pluck(d, 84 + vrnd(0, 7), t, 0.03, 0.25, 'sine');
    },
  },

  // Piso II: órgano gótico, coro suave y la campana de la torre
  castle: {
    bpm: 52, div: 1, vol: 1.9,
    step(i, t, d) {
      const prog = [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59]];
      if (i % 4 === 0) {
        const ch = prog[(i / 4) % 4], dur = (60 / 52) * 4;
        for (const m of [...ch, ch[0] + 12])
          voice(d, 'square', mtof(m), t, dur, 0.022, { attack: 0.4, release: 0.6, cutoff: 1100 });
        voice(d, 'sawtooth', mtof(ch[0] - 24), t, dur, 0.07, { attack: 0.5, release: 0.6, cutoff: 300 });
        pad(d, [ch[1] + 12, ch[2] + 12], t, dur, 0.015, 700);
      }
      if (i % 16 === 0) bell(d, 45, t + 0.3, 0.12, 5);
      if (i % 4 === 2 && Math.random() < 0.6) pluck(d, [69, 72, 76, 74, 71][vrnd(0, 4)], t, 0.035, 1.2, 'square');
    },
  },

  // Piso III: zumbido en trítono, latido, roces metálicos y susurros
  abyss: {
    bpm: 44, div: 2, vol: 2.6,
    step(i, t, d) {
      if (i % 24 === 0) {
        voice(d, 'sawtooth', mtof(26), t, 16.6, 0.07, { attack: 4, release: 5, cutoff: 220 });
        voice(d, 'sawtooth', mtof(32), t, 16.6, 0.05, { attack: 5, release: 5, cutoff: 240, detune: 8 });
      }
      if (i % 4 === 0) drum(d, t, 0.22, 70, 30, 0.4);
      if (i % 4 === 1) drum(d, t, 0.13, 65, 30, 0.35);
      if (Math.random() < 0.06) hiss(d, t, 0.05, 1.2, 'bandpass', vrnd(1500, 3500), 600, 12);
      if (Math.random() < 0.04) hiss(d, t, 0.04, 1.6, 'bandpass', 400, 1600, 6);
      if (i % 48 === 20) bell(d, 73, t, 0.04, 4), bell(d, 74, t + 0.02, 0.03, 4);
    },
  },

  // Jefes del Piso I y II: tambores, bajo en semicorcheas, cuerdas y golpes de acorde
  boss: {
    bpm: 112, div: 4, echo: 0.27, vol: 1.4,
    step(i, t, d) {
      const prog = [50, 50, 46, 45];       // Re, Re, Sib, La
      const bar = Math.floor(i / 16) % 4, s = i % 16, root = prog[bar];
      if ([0, 6, 8, 11].includes(s)) drum(d, t, 0.38);
      if (s === 4 || s === 12) hiss(d, t, 0.12, 0.16, 'highpass', 1800);
      if (s % 2 === 1) hiss(d, t, 0.025, 0.05, 'highpass', 7000);
      const bass = [0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0, 3, 0, 12, 1][s];
      voice(d, 'sawtooth', mtof(root - 12 + bass), t, 0.13, 0.07, { attack: 0.005, release: 0.06, cutoff: 650 });
      if (s === 0) {
        const third = bar === 3 ? 4 : 3;   // el La es mayor: tensión antes de volver
        pad(d, [root + 12, root + 12 + third, root + 19], t, 2.1, 0.022, 1300);
        voice(d, 'square', mtof(root + 24), t, 0.25, 0.04, { attack: 0.005, release: 0.15, cutoff: 1800 });
      }
    },
  },

  // Jefe final: medio tiempo, coro, metales graves y campanas en modo frigio
  final: {
    bpm: 84, div: 4, echo: 0.42, vol: 1.15,
    step(i, t, d) {
      const prog = [[50, 53, 57], [51, 55, 58], [50, 53, 57], [49, 52, 55]]; // Rem, Mib, Rem, Do#dim
      const bar = Math.floor(i / 16) % 4, s = i % 16, ch = prog[bar];
      if (s === 0 || s === 10) drum(d, t, 0.5, 90, 28, 0.6);
      if (s === 8) { drum(d, t, 0.3, 160, 60, 0.25); hiss(d, t, 0.14, 0.3, 'bandpass', 900); }
      if (s === 0) {
        const dur = (60 / 84) * 4;
        pad(d, ch.map(m => m + 12), t, dur, 0.024, 800);
        for (const m of [ch[0] - 12, ch[0]])
          voice(d, 'square', mtof(m), t, dur * 0.9, 0.05, { attack: 0.08, release: 0.4, cutoff: 500 });
        bell(d, ch[0] + 24, t, 0.06, 3);
      }
      if (s === 12 && bar % 2 === 1) bell(d, ch[2] + 24, t, 0.04, 2);
      if (s % 4 === 2) voice(d, 'sawtooth', mtof(ch[0] - 12), t, 0.2, 0.05, { attack: 0.01, release: 0.1, cutoff: 400 });
    },
  },
};

// El tema que corresponde a dónde está el jugador
function floorMusic() { return FLOOR_THEME[S.floor] || 'crypt'; }
