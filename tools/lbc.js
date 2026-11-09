// Outils de dépôt leboncoin (exécutés dans la page https://www.leboncoin.fr/deposer-une-annonce)
window.LBC = {
  sleep: ms => new Promise(r => setTimeout(r, ms)),
  async waitFor(fn, timeout = 15000, step = 300) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) { const v = fn(); if (v) return v; await LBC.sleep(step); }
    return null;
  },
  setVal(el, val) {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  },
  click(el) {
    ['pointerdown', 'mousedown', 'pointerup', 'mouseup'].forEach(t => el.dispatchEvent(new MouseEvent(t, { bubbles: true })));
    el.click();
  },
  byText(sel, re) { return [...document.querySelectorAll(sel)].find(e => re.test((e.getAttribute('aria-label') || '').trim()) || re.test((e.innerText || '').trim())); },
  async phaseA(item) {
    // titre
    const ti = await LBC.waitFor(() => [...document.querySelectorAll('input[type=text]')].find(i => /titre/i.test(i.getAttribute('aria-label') || '') || i.id === 'subject') || document.querySelector('input[type=text]'));
    if (!ti) return 'ERR titre introuvable';
    LBC.setVal(ti, ''); await LBC.sleep(200); LBC.setVal(ti, item.title);
    const cat = await LBC.waitFor(() => document.querySelector('[aria-label^="Choix 1"]'));
    if (!cat) return 'ERR categorie';
    const catLabel = cat.getAttribute('aria-label') || cat.innerText;
    LBC.click(cat);
    // photos
    const inp = await LBC.waitFor(() => document.querySelector('input[type=file]'));
    if (!inp) return 'ERR input photo';
    if (document.querySelectorAll('img[alt*="hoto"], [aria-label^="Photo n°"]').length > 0 || /Couverture/.test(document.body.innerText)) return 'ERR brouillon avec photos deja presentes';
    const dt = new DataTransfer();
    for (let k = 1; k <= item.n; k++) {
      const r = await fetch(`https://raw.githubusercontent.com/thibaudmerlin-arch/photos-annonces/main/photos/${item.id}/${k}.jpg`);
      if (!r.ok) return 'ERR photo ' + k + ' HTTP ' + r.status;
      dt.items.add(new File([await r.blob()], `photo-${k}.jpg`, { type: 'image/jpeg' }));
    }
    inp.files = dt.files; inp.dispatchEvent(new Event('change', { bubbles: true }));
    const ok = await LBC.waitFor(() => new RegExp(`photo n° ${item.n} a bien été ajoutée`).test(document.body.innerText), 40000);
    if (!ok) return 'ERR upload photos';
    await LBC.sleep(4000); // laisse leboncoin pré-remplir les attributs
    return 'OK ' + catLabel;
  },
  async pick(labelRe, optRe) {
    const lab = [...document.querySelectorAll('label')].find(l => labelRe.test(l.innerText.trim()));
    if (!lab) return 'nolabel';
    const box = lab.closest('div')?.parentElement?.querySelector('button,[role=combobox],input') ;
    if (!box) return 'nobox';
    LBC.click(box);
    const opt = await LBC.waitFor(() => [...document.querySelectorAll('[role=option],li')].find(o => optRe.test(o.innerText.trim())), 5000);
    if (!opt) return 'noopt';
    LBC.click(opt); await LBC.sleep(500); return 'ok';
  },
  fields() {
    const out = {};
    [...document.querySelectorAll('label')].forEach(l => { const c = l.closest('div')?.parentElement; const v = c?.querySelector('input,button')?.value || c?.innerText.replace(l.innerText, '').trim().split('\n')[0]; out[l.innerText.trim()] = v; });
    return out;
  },
  async next() { const b = LBC.byText('button', /^Continuer$/); if (!b) return 'ERR continuer'; LBC.click(b); return 'ok'; },
  async phaseB(item) {
    const ta = await LBC.waitFor(() => document.querySelector('textarea'), 20000);
    if (!ta) return 'ERR description';
    const cleanDesc = (item.desc || '').split('\n').filter(l => !/^\s*#/.test(l)).join('\n').replace(/\n{3,}/g, '\n\n').trim(); // regle leboncoin : pas de hashtags/mots-cles
    ta.focus(); LBC.setVal(ta, cleanDesc); ta.blur(); await LBC.sleep(1200);
    if (/(^|\s)#\w/.test(document.querySelector('textarea').value)) return 'ERR hashtags non retires';
    const price = [...document.querySelectorAll('input[type=text]')].find(i => /prix/i.test(i.getAttribute('aria-label') || '') || /price/i.test(i.name || i.id || ''));
    if (!price) return 'ERR prix';
    LBC.setVal(price, String(item.price));
    const addr = document.querySelector('input[placeholder="Adresse"]');
    if (addr && !/Muret \(31600\)/.test(addr.value)) {
      addr.focus(); LBC.setVal(addr, ''); await LBC.sleep(300); LBC.setVal(addr, 'Muret 31600');
      const o = await LBC.waitFor(() => [...document.querySelectorAll('[role=option]')].find(x => x.innerText.trim().startsWith('Muret (31600)')), 8000);
      if (!o) return 'ERR adresse';
      LBC.click(o); await LBC.sleep(1000);
    }
    const a2 = document.querySelector('input[placeholder="Adresse"]');
    const liv = /Désactiver la livraison/.test(document.body.innerHTML);
    return JSON.stringify({ desc: ta.value.length, price: price.value, addr: a2 && a2.value, livraison: liv });
  },
};

LBC.combo = async (labelRe, optRe) => {
  const l = [...document.querySelectorAll('label')].find(x => labelRe.test(x.innerText.trim()));
  if (!l) return 'nolabel';
  const f = l.closest('[data-spark-component="form-field"]');
  const btn = f.querySelector('button[aria-label="Ouvrir la liste"]') || f.querySelector('input[role=combobox]');
  LBC.click(btn);
  const o = await LBC.waitFor(() => [...document.querySelectorAll('[role=option]')].find(x => optRe.test(x.innerText.trim())), 5000);
  if (!o) return 'noopt';
  LBC.click(o); await LBC.sleep(600); return f.querySelector('input').value;
};
// Publie un article de bout en bout. item = {id,title,price,n,desc}. Résultat dans window.__lbcRes
LBC.run = async (item) => {
  const log = [];
  try {
    const a = await LBC.phaseA(item); log.push(a); if (!a.startsWith('OK')) throw a;
    const etat = await LBC.combo(/^État/, /^Très bon état$/); log.push('etat:' + etat);
    // champs obligatoires vides ?
    const empty = [...document.querySelectorAll('label')].filter(l => /\*$/.test(l.innerText.trim())).filter(l => { const f = l.closest('[data-spark-component="form-field"]'); const i = f && f.querySelector('input'); return i && !i.value; }).map(l => l.innerText.trim());
    if (empty.length) throw 'ERR champs obligatoires vides: ' + empty.join(', ');
    await LBC.next();
    const b = await LBC.phaseB(item); log.push(b); if (b.startsWith('ERR')) throw b;
    const chk = JSON.parse(b); if (chk.addr !== 'Muret (31600)' || !chk.livraison || String(chk.price) !== String(item.price)) throw 'ERR verif ' + b;
    const t = document.querySelector('input[type=text]').value; if (t !== item.title) throw 'ERR titre modifie: ' + t;
    await LBC.next();
    const nb = await LBC.waitFor(() => LBC.byText('button', /Déposer sans booster/), 25000);
    if (!nb) throw 'ERR page options: ' + document.body.innerText.slice(0, 200);
    LBC.click(nb);
    const ok = await LBC.waitFor(() => /confirmation/.test(location.href), 25000);
    if (!ok) throw 'ERR confirmation: ' + document.body.innerText.slice(0, 200);
    log.push('PUBLIE');
    window.__lbcRes = { ok: true, log };
  } catch (e) { window.__lbcRes = { ok: false, log, err: String(e) }; }
  return window.__lbcRes;
};
// Charge items.json depuis GitHub et publie l'article id
LBC.runId = async (id, sha) => {
  window.__lbcRes = null;
  const items = await (await fetch(`https://raw.githubusercontent.com/thibaudmerlin-arch/photos-annonces/${sha}/items.json`)).json();
  const it = items.find(x => String(x.id) === String(id));
  if (!it) { window.__lbcRes = { ok: false, err: 'id absent de items.json' }; return; }
  return LBC.run(it);
};

// Boucle autonome : publie les ids un par un dans une iframe (même origine), s'arrête à la 1re erreur.
LBC.loop = async (ids, sha, pauseMs = 150000) => {
  const code = await (await fetch(`https://raw.githubusercontent.com/thibaudmerlin-arch/photos-annonces/${sha}/tools/lbc.js`)).text();
  let fr = document.getElementById('__lbcFrame');
  if (!fr) { fr = document.createElement('iframe'); fr.id = '__lbcFrame'; fr.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:99999;background:#fff;border:0'; document.body.appendChild(fr); }
  const log = JSON.parse(localStorage.getItem('__lbcLog') || '[]');
  window.__loopState = { running: true, done: 0, total: ids.length, last: null };
  for (const id of ids) {
    if (window.__loopStop) break;
    if (log.find(x => String(x.id) === String(id) && x.ok)) continue;
    fr.src = 'https://www.leboncoin.fr/deposer-une-annonce?' + Date.now();
    await new Promise(r => { fr.onload = r; });
    await LBC.sleep(3500);
    const w = fr.contentWindow;
    w.eval(code);
    const res = await w.LBC.runId(id, sha);
    const entry = { id, ok: !!(res && res.ok), err: res && res.err, log: res && res.log, at: new Date().toISOString() };
    log.push(entry); localStorage.setItem('__lbcLog', JSON.stringify(log));
    window.__loopState.last = entry; window.__loopState.done++;
    if (!entry.ok) { window.__loopState.running = false; window.__loopState.stoppedOn = id; return entry; }
    await LBC.sleep(60000 + Math.floor(Math.random() * 120000)); // pause aleatoire 1 a 3 min
  }
  window.__loopState.running = false; return 'fini';
};

'LBC chargé';
