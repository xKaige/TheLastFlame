'use strict';
// Sonido sintetizado con WebAudio (sin archivos de audio todavía)
let AC = null, master = null, sfxBus = null, musicBus = null, noise = null;

function audioInit() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  AC = new (window.AudioContext || window.webkitAudioContext)();
  master = AC.createGain(); master.connect(AC.destination);
  sfxBus = AC.createGain(); sfxBus.connect(master);
  musicBus = AC.createGain(); musicBus.connect(master);
  applyVolumes();
  noise = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // arranca la música que el juego pidió antes de que hubiera audio
  if (MUSIC.want) { const w = MUSIC.want; MUSIC.want = null; setMusic(w); }
}

// Volúmenes de las opciones (0..1); el maestro conserva el nivel de mezcla original
function applyVolumes() {
  if (!AC) return;
  master.gain.value = 0.55 * SETTINGS.master;
  sfxBus.gain.value = SETTINGS.sfx;
  musicBus.gain.value = SETTINGS.music;
}

function env(gain, t, a, peak, dur) {
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + a);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

function noiseHit(type, freq, q, peak, dur, freqEnd) {
  const t = AC.currentTime;
  const src = AC.createBufferSource(); src.buffer = noise;
  const f = AC.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
  const g = AC.createGain(); env(g, t, 0.005, peak, dur);
  src.connect(f).connect(g).connect(sfxBus);
  src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
}

function tone(wave, f0, f1, peak, dur, delay = 0) {
  const t = AC.currentTime + delay;
  const o = AC.createOscillator(); o.type = wave;
  o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = AC.createGain(); env(g, t, 0.01, peak, dur);
  o.connect(g).connect(sfxBus); o.start(t); o.stop(t + dur + 0.05);
}

function sfx(name) {
  if (!AC) return;
  switch (name) {
    case 'step': noiseHit('bandpass', 260 + Math.random() * 80, 1.2, 0.35, 0.12); break;
    case 'bump': tone('sine', 80, 40, 0.5, 0.18); break;
    case 'turn': noiseHit('bandpass', 900, 0.8, 0.05, 0.08); break;
    case 'swing': noiseHit('bandpass', 2200, 1.5, 0.25, 0.16, 500); break;
    case 'hit': noiseHit('lowpass', 900, 1, 0.6, 0.22); tone('sine', 120, 45, 0.5, 0.25); break;
    case 'miss': noiseHit('highpass', 3000, 0.7, 0.12, 0.2, 1200); break;
    case 'hurt': tone('sawtooth', 170, 70, 0.22, 0.3); noiseHit('lowpass', 500, 1, 0.4, 0.2); break;
    case 'fire': for (let i = 0; i < 6; i++) setTimeout(() => noiseHit('bandpass', 1200 + Math.random() * 1500, 2, 0.25, 0.08), i * 45);
      noiseHit('lowpass', 600, 0.7, 0.4, 0.5); break;
    case 'pickup': tone('triangle', 660, 0, 0.25, 0.12); tone('triangle', 990, 0, 0.25, 0.2, 0.1); break;
    case 'chest': tone('square', 110, 90, 0.08, 0.25); noiseHit('bandpass', 400, 3, 0.2, 0.3, 200); break;
    case 'encounter': tone('sawtooth', 98, 0, 0.12, 0.6); tone('sawtooth', 104, 0, 0.12, 0.6); noiseHit('lowpass', 200, 1, 0.5, 0.5); break;
    case 'whisper': noiseHit('bandpass', 500, 9, 0.35, 1.2, 1800); setTimeout(() => noiseHit('bandpass', 1400, 9, 0.25, 0.9, 600), 500); break;
    case 'stairs': tone('sine', 220, 55, 0.35, 1.2); noiseHit('lowpass', 300, 1, 0.3, 1.0); break;
    case 'level': [392, 494, 587, 784].forEach((f, i) => tone('triangle', f, 0, 0.2, 0.3, i * 0.11)); break;
    case 'death': tone('sawtooth', 110, 30, 0.3, 2.2); noiseHit('lowpass', 400, 1, 0.4, 2, 60); break;
    case 'heal': tone('sine', 440, 880, 0.2, 0.4); break;
    case 'oil': noiseHit('bandpass', 700, 4, 0.3, 0.4, 300); tone('sine', 300, 600, 0.12, 0.4, 0.2); break;
    case 'snuff': noiseHit('lowpass', 1400, 1, 0.5, 1.4, 60); tone('sine', 90, 30, 0.35, 1.6); break;
    case 'crumble': noiseHit('lowpass', 500, 1, 0.7, 0.9, 80); for (let i = 0; i < 5; i++) setTimeout(() => noiseHit('bandpass', 700 + Math.random() * 900, 4, 0.2, 0.08), 120 + i * 90); break;
    case 'vanish': noiseHit('bandpass', 1800, 2, 0.35, 0.7, 250); tone('sine', 300, 60, 0.18, 0.7); break;
    case 'sputter': for (let i = 0; i < 3; i++) setTimeout(() => noiseHit('bandpass', 900 + Math.random() * 900, 3, 0.12, 0.06), i * 70); break;
    // golpes según el arma y los efectos del combate
    case 'slash': noiseHit('bandpass', 3400, 2.5, 0.3, 0.14, 1200); tone('sine', 160, 70, 0.25, 0.14); break;
    case 'heavy': noiseHit('lowpass', 520, 1, 0.8, 0.32, 120); tone('sine', 95, 32, 0.7, 0.38); break;
    case 'stab': noiseHit('bandpass', 4200, 4, 0.28, 0.07, 1800); tone('sine', 220, 90, 0.3, 0.12); break;
    case 'clang': tone('square', 1260, 1180, 0.08, 0.35); tone('triangle', 2380, 2250, 0.12, 0.55); noiseHit('highpass', 4000, 1, 0.35, 0.12); break;
    case 'claw': for (let i = 0; i < 3; i++) setTimeout(() => noiseHit('bandpass', 2600 + i * 500, 2, 0.28, 0.1, 900), i * 35); break;
    case 'bite': noiseHit('lowpass', 1300, 2, 0.55, 0.12); tone('square', 150, 60, 0.12, 0.14); break;
    case 'magic': tone('sine', 660, 1320, 0.14, 0.35); tone('triangle', 990, 1980, 0.08, 0.4, 0.05); noiseHit('bandpass', 3000, 5, 0.15, 0.4, 6000); break;
    case 'holy': [523, 659, 784, 1047].forEach((f, i) => tone('sine', f, 0, 0.1, 1, i * 0.07)); break;
    case 'whoosh': noiseHit('bandpass', 700, 1, 0.3, 0.28, 2600); break;
    case 'select': tone('square', 520, 0, 0.05, 0.05); break;
  }
}

// ---------- Voces: un "blip" con formantes por letra, distinto para cada personaje ----------
const VOICE_CPS = 30; // letras por segundo al escribir
const VOICES = {
  narrador: { base: 108, spread: 0.16, wave: 'triangle', formants: [560, 1300], q: 5, dur: 0.08, gain: 0.55, osc: 1, breath: 0, every: 2 },
  sombra:   { base: 150, spread: 0.3, wave: 'sine', formants: [950, 2400], q: 8, dur: 0.1, gain: 0.5, osc: 0.35, breath: 1.3, every: 2 },
  rey:      { base: 60, spread: 0.1, wave: 'sawtooth', formants: [380, 880], q: 4, dur: 0.12, gain: 0.5, osc: 1, breath: 0.4, every: 3 },
};

function voiceBlip(ch, name, delay = 0) {
  if (!AC) return;
  const v = VOICES[name], t = AC.currentTime + delay;
  const c = ch.toLowerCase(), code = c.charCodeAt(0);
  const vowel = 'aeiouáéíóú'.includes(c);
  const f = v.base * (1 + (((code * 7) % 9) - 4) / 4 * v.spread) * (vowel ? 1.06 : 1);
  const out = AC.createGain(); env(out, t, 0.008, v.gain, v.dur); out.connect(sfxBus);
  const bands = v.formants.map((ff, i) => {
    const b = AC.createBiquadFilter(); b.type = 'bandpass';
    b.frequency.value = ff * (vowel ? 1 : 0.82) * (1 + (((code * (i + 3)) % 5) - 2) * 0.05);
    b.Q.value = v.q; b.connect(out); return b;
  });
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.connect(out);
  if (v.osc) {
    const o = AC.createOscillator(), og = AC.createGain();
    o.type = v.wave; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.9, t + v.dur);
    og.gain.value = v.osc;
    o.connect(og); for (const b of bands) og.connect(b);
    const direct = AC.createGain(); direct.gain.value = 0.3 * v.osc; o.connect(direct).connect(lp);
    o.start(t); o.stop(t + v.dur + 0.05);
  }
  if (v.breath) {
    const n = AC.createBufferSource(), ng = AC.createGain();
    n.buffer = noise; ng.gain.value = v.breath;
    n.connect(ng); for (const b of bands) ng.connect(b);
    n.start(t, Math.random() * 0.5); n.stop(t + v.dur + 0.05);
  }
}

// Dice una frase entera programando los blips en el tiempo
function speakLine(text, name, delay = 0) {
  const v = VOICES[name];
  for (let i = 0; i < text.length; i++)
    if (/[a-záéíóúñü]/i.test(text[i]) && i % v.every === 0) voiceBlip(text[i], name, delay + i / VOICE_CPS);
  return text.length / VOICE_CPS;
}

// Voces grabadas opcionales: assets/voz/voces.js registra window.VOCES = { 'intro_0_0': 'archivo.mp3', ... }
function recordedVoice(id) {
  const file = window.VOCES && window.VOCES[id];
  if (!file) return null;
  const a = new Audio('assets/voz/' + file);
  a.volume = 0.95 * SETTINGS.master * SETTINGS.sfx;
  a.play().catch(() => {});
  return a;
}
