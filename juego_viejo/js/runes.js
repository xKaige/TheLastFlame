'use strict';
// Runas: piedras talladas que se encastran en ranuras y cambian cómo jugás.
// Cada efecto se calcula en un solo lugar (recalc o la acción que lo usa), así no se aplica dos veces.
// P.runes = runas encontradas · P.runeEq = runas encastradas (como mucho runeSlots()).

const RUNES = {
  brasa:  { name: 'Runa de Brasa', desc: 'Quemar con la antorcha hace un 40% más de daño.' },
  sol:    { name: 'Runa del Sol', desc: 'La antorcha se consume un 15% más lento.' },
  aguas:  { name: 'Runa de las Aguas', desc: 'Al vencer a un enemigo, tu antorcha recupera 3.' },
  vida:   { name: 'Runa de la Vida', desc: 'Al vencer a un enemigo, recuperas un 8% de tu vida.' },
  orden:  { name: 'Runa del Orden', desc: '+8% de probabilidad de crítico.' },
  piedra: { name: 'Runa de Piedra', desc: 'Al defenderte, el golpe que recibes se reduce un 35% más.' },
  umbral: { name: 'Runa del Umbral', desc: 'Las paredes huecas se derrumban al primer golpe.' },
  vacio:  { name: 'Runa del Vacío', desc: 'Las salas secretas se marcan en tu mapa.' },
  // lock: sólo aparecen después de despertarlas en el Altar de la Llama
  rayo:   { name: 'Runa del Rayo', desc: 'Tus golpes tienen un 20% de descargar un rayo: +60% de daño.', lock: 'runaRayo' },
  rey:    { name: 'Runa del Rey', desc: 'Ganas un 25% más de experiencia.', lock: 'runaRey' },
  destino:{ name: 'Runa del Destino', desc: 'Una vez por nivel, un golpe que te mataría te deja con 1 de vida.', lock: 'runaDestino' },
};
const runeAvailable = id => !RUNES[id].lock || contentUnlocked(RUNES[id].lock);

// 2 ranuras; la tercera se abre al vencer al jefe del primer piso
const runeSlots = () => 2 + (S.flags.down_reyOsario ? 1 : 0) + (S.flags.kingSlot ? 1 : 0);
const hasRune = id => !!P && !!P.runeEq && P.runeEq.includes(id);

function ensureRunes() {
  P.runes = P.runes || [];
  P.runeEq = P.runeEq || [];
}

// Entrega una runa que no tengas; si encuentra ranura libre, la encastra sola
function giveRune(source) {
  ensureRunes();
  const left = Object.keys(RUNES).filter(id => runeAvailable(id) && !P.runes.includes(id));
  if (!left.length) return null;
  const id = pick(left), r = RUNES[id];
  P.runes.push(id);
  codexNote('runes', id);
  const auto = P.runeEq.length < runeSlots();
  if (auto) P.runeEq.push(id);
  recalc();
  log(tr('{0}: {1}{2}.', source, r.name, auto ? tr(', encastrada') : ''), 'good');
  toastQueue.push({ title: r.name, desc: r.desc, kind: auto ? 'Runa · encastrada en una ranura libre' : 'Runa · [R] para encastrarla' });
  nextToast();
  updateHUD();
  checkAchievements();
  return id;
}

function openRunesMenu() {
  ensureRunes();
  const m = { wrap: true, items: [] };
  const refresh = () => {
    const slots = runeSlots(), total = Object.keys(RUNES).filter(runeAvailable).length;
    m.title = tr('Runas · {0}/{1} ranuras{2}', P.runeEq.length, slots, (P.relics || []).length ? tr(' · {0} reliquia{1}', P.relics.length, P.relics.length > 1 ? 's' : '') : '');
    m.text = P.runes.length
      ? tr('Encontraste {0} de {1}. Enter encastra o quita.', P.runes.length, total)
      : 'Todavía no encontraste ninguna. Aparecen en cofres, eventos y en lo que dejan los jefes.';
    m.items = P.runes.map(id => {
      const on = P.runeEq.includes(id);
      return {
        label: `◈ ${RUNES[id].name}${on ? tr(' <small>· encastrada</small>') : ''}`,
        sub: RUNES[id].desc,
        fn: () => {
          if (on) { P.runeEq = P.runeEq.filter(x => x !== id); m.msg = tr('Quitas la {0}.', RUNES[id].name); }
          else if (P.runeEq.length >= slots) { m.msg = 'No hay ranuras libres: quita una runa primero.'; sfx('bump'); }
          else { P.runeEq.push(id); m.msg = tr('Encastras la {0}.', RUNES[id].name); sfx('pickup'); }
          recalc(); updateHUD(); refresh(); renderMenu();
        },
      };
    });
    m.items.push(...relicMenuItems());
    if (!m.items.length) m.items = [{ label: 'Volver', fn: closeMenu }];
  };
  refresh();
  openMenu(m, 'game');
}
