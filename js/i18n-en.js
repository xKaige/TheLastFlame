'use strict';
// Vuelve traducibles las tablas de datos del juego base. Los textos están en datos/idiomas.

function localizeAll() {
  localizeAllIn(RACES, ['name', 'desc']);
  localizeAllIn(CLASSES, ['name', 'desc', 'diff']);
  localizeMap(WEIGHT_NAME); localizeMap(WEIGHT_CLASS); localizeMap(TIER_NAME); localizeMap(SLOT_NAME);
  for (const a of Object.values(AFFIX)) localize(a, ['label']);
  localizeAllIn(ENEMIES, ['name', 'short']);
  for (const d of Object.values(ENEMIES)) if (d.special) localize(d.special, ['msg']);
  localizeMap(FOE_LORE);
  localizeAllIn(RUNES, ['name', 'desc']);
  localizeAllIn(RELICS, ['name', 'desc', 'cost']);
  for (const ev of Object.values(EVENTS)) { localize(ev, ['name', 'intro', 'doneText']); for (const c of ev.choices) localize(c, ['label', 'sub']); }
  for (const list of Object.values(SKILLS)) for (const s of list) localize(s, ['name', 'short', 'desc']);
  for (const a of ATTRS) localize(a, ['name', 'fx']);
  localizeAllIn(UNLOCKS, ['name', 'desc']);
  localizeAllIn(MODS, ['name', 'desc']);
  localizeAllIn(ACHIEVEMENTS, ['name', 'desc']);
  localizeAllIn(ENDINGS, ['name', 'label', 'sub', 'text']);
  for (const list of Object.values(PROPS)) for (const p of list) if (typeof p[3] === 'string') { const t = p[3]; Object.defineProperty(p, 3, { get: () => tr(t) }); }
}
