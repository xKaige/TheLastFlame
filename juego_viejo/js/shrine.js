'use strict';
// Santuario: un respiro entre pisos (nivel 0 de cada piso a partir del II), sin enemigos.
// Tiene una fogata (te recupera una vez) y al Mercader de Huesos, que compra lo que ya no usas
// a cambio de óbolos y vende pociones, aceite y runas. Así guardar equipo viejo tiene sentido.

const SHRINE = {
  sell: [4, 9, 16],                 // óbolos por calidad (Común, Fina, Antigua); +2 si tiene afijo
  buy: { potion: 12, oil: 8, rune: 35 },
};
const isShrine = () => S.level === 0;

// Una sala de 8×7 en el centro del mapa: escalera arriba a la derecha, mercader y fogata adentro
function genShrine() {
  const map = new Uint8Array(MW * MH).fill(1), wtype = new Uint8Array(MW * MH);
  const x0 = 10, y0 = 10, w = 8, h = 7;
  carveRect(map, x0, y0, w, h);
  for (let i = 0; i < MW * MH; i++) wtype[i] = rnd(0, 2);
  map[y0 * MW + x0 + w - 1] = 2;
  const ents = [
    { type: 'merchant', x: x0 + 1, y: y0 + 1 },
    { type: 'bonfire', x: x0 + 4, y: y0 + 3, used: false },
  ];
  for (const e of ents) { e.vx = e.x + 0.5; e.vy = e.y + 0.5; }
  return { map, wtype, ents, theme: FLOOR_THEME[S.floor], secrets: [], explored: new Uint8Array(MW * MH), start: [x0 + 3, y0 + h - 1, 3] };
}

// ---------- Fogata ----------
function useBonfire(b) {
  if (b.used) { sfx('bump'); log('Solo quedan brasas. Ya descansaste aquí.'); return; }
  b.used = true;
  P.hp = P.maxhp;
  P.fuel = 100;
  sfx('oil'); fx.flash = 0.4;
  log('Te sientas junto al fuego. Tus heridas se cierran y tu antorcha vuelve a arder entera.', 'em');
  updateHUD();
}

// ---------- Mercader de Huesos ----------
const sellPrice = it => SHRINE.sell[it.tier] + (it.aff ? 2 : 0);

function openMerchant() {
  sfx('whisper');
  const m = { title: tr('El Mercader de Huesos'), art: 'merchant', wrap: true, items: [] };
  const refresh = () => {
    P.coins = P.coins || 0;
    m.text = tr('«Todo lo que cargas pesa. Yo te alivio.» Tienes <b>{0} óbolos</b>.', P.coins);
    m.items = [
      { label: tr('Vender equipo <small>· {0} en la mochila</small>', P.bag.length), sub: 'Lo que ya no usas, a cambio de óbolos.', off: !P.bag.length, fn: openSellMenu },
      buyItem('Poción de sangre', SHRINE.buy.potion, P.potions >= BAL.maxPotions ? 'tu cinturón está lleno' : tr('tienes {0}/{1}', P.potions, BAL.maxPotions),
        P.potions < BAL.maxPotions, () => { P.potions++; return 'Una poción, todavía tibia.'; }),
      buyItem('Frasco de aceite', SHRINE.buy.oil, P.oil >= BAL.maxOil ? 'tu cinturón está lleno' : tr('tienes {0}/{1}', P.oil, BAL.maxOil),
        P.oil < BAL.maxOil, () => { P.oil++; return 'Aceite espeso, de lámpara de capilla.'; }),
      buyItem('Una runa del saco', SHRINE.buy.rune, 'al azar, de las que no tienes',
        Object.keys(RUNES).some(id => runeAvailable(id) && !(P.runes || []).includes(id)),
        () => { const r = giveRune('El mercader te vende'); return r ? tr('Mete la mano en el saco y saca la {0}.', RUNES[r].name) : ''; }),
      { label: tr('Despedirte'), fn: closeMenu },
    ];
  };
  const buyItem = (name, cost, sub, can, give) => ({
    label: tr('{0} <small>· {1} óbolos</small>', name, cost), sub, off: !can || P.coins < cost,
    fn: () => { P.coins -= cost; m.msg = give(); sfx('pickup'); updateHUD(); refresh(); renderMenu(); },
  });
  m.refresh = refresh;
  refresh();
  openMenu(m, 'game');
}

function openSellMenu() {
  const parent = topMenu();
  const m = { title: tr('Vender equipo'), art: 'merchant', wrap: true, items: [] };
  const refresh = () => {
    m.text = tr('Tienes <b>{0} óbolos</b>. ▲ mejor y ▼ peor que lo que llevas puesto.', P.coins);
    m.items = P.bag.map((it, i) => ({
      label: tr('{0}{1} <small>· {2} óbolos</small>', canEquip(it) ? itemArrow(it).replace(/<[^>]+>/g, '') + ' ' : '', itemName(it), sellPrice(it)),
      sub: `${SLOT_NAME[it.slot]} · ${TIER_NAME[it.tier]} · ${itemStats(it)}${canEquip(it) ? '' : tr(' · no es para tu clase')}`,
      fn: () => {
        const sold = P.bag.splice(i, 1)[0];
        P.coins = (P.coins || 0) + sellPrice(sold);
        PROFILE.stats.sold = (PROFILE.stats.sold || 0) + 1; saveProfile(); checkAchievements();
        m.msg = tr('Vendes {0} por {1} óbolos.', itemName(sold), sellPrice(sold));
        sfx('pickup'); updateHUD();
        refresh(); m.sel = clamp(m.sel, 0, m.items.length - 1); renderMenu();
      },
    }));
    if (!m.items.length) m.items = [{ label: 'No te queda nada para vender', fn: closeMenu }];
  };
  refresh();
  // al volver, el menú del mercader muestra los óbolos nuevos
  m.onClose = () => { if (parent.refresh) parent.refresh(); };
  openMenu(m, 'game');
}

// ---------- Dibujo del mercader ----------
function drawMerchant(g) {
  poly(g, [[14, 63.5], [50, 63.5], [46, 30], [36, 20], [26, 20], [18, 30]], 0.3);
  for (let i = 0; i < 4; i++) line(g, 22 + i * 6, 32, 18 + i * 9, 63, 0.7, 0.2);
  // saco al hombro
  ell(g, 44, 30, 9, 11, 0.42); line(g, 38, 22, 46, 20, 1.4, 0.6);
  for (const [x, y] of [[41, 27], [47, 33], [43, 36]]) ell(g, x, y, 1.6, 1, 0.82, 0.4);
  // capucha y cara en sombra
  poly(g, [[22, 26], [25, 10], [32, 5], [39, 10], [41, 26], [36, 23], [28, 23]], 0.36);
  ell(g, 32, 16, 5, 6, 0.06, 0);
  ell(g, 30, 15.5, 0.9, 0.7, 0.95, 0); ell(g, 34, 15.5, 0.9, 0.7, 0.95, 0);
  // collar de huesos
  for (let k = 0; k < 7; k++) ell(g, 26 + k * 2, 25 + Math.sin(k * 0.9) * 1.2, 1, 0.7, 0.9, 0.5);
  // farol en la mano
  limb(g, [[22, 30], [15, 38], [13, 42]], 2.4, 0.3);
  line(g, 13, 42, 13, 46, 0.6, 0.6);
  poly(g, [[10, 46], [16, 46], [16, 54], [10, 54]], 0.5, 0.8);
  ell(g, 13, 50, 2, 2.6, 1, 0);
}
