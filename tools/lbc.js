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
    // brouillon repris a une etape avancee : revenir au titre
    await LBC.waitFor(() => /Retour|titre de l/.test(document.body.innerText), 15000);
    for (let k = 0; k < 4 && !/titre de l.annonce/i.test(document.body.innerText); k++) {
      const r = [...document.querySelectorAll('button')].find(x => x.innerText.trim() === 'Retour');
      if (!r) break; LBC.click(r); await LBC.sleep(2500);
    }
    // titre
    const ti = await LBC.waitFor(() => [...document.querySelectorAll('input[type=text]')].find(i => /titre/i.test(i.getAttribute('aria-label') || '') || i.id === 'subject') || document.querySelector('input[type=text]'));
    if (!ti) return 'ERR titre introuvable';
    LBC.setVal(ti, ''); await LBC.sleep(200); LBC.setVal(ti, item.title);
    const top = String(item.vcat || '').split('>');
    if (!/^(Hommes|Femmes|Enfants)$/.test(top[0])) return 'ERR rayon Vinted inconnu: ' + item.vcat;
    const want = top[1] === 'Chaussures' ? /catégorie Chaussures/ : /^(Accessoires|Sacs)/.test(top[1] || '') ? /Accessoires|Bagagerie|Montres|Bijoux/ : /catégorie Vêtements dans/;
    if (!(await LBC.waitFor(() => document.querySelector('[aria-label^="Choix 1"]'), 20000))) { LBC.setVal(ti, item.title + ' '); await LBC.sleep(300); LBC.setVal(ti, item.title); }
    const cat = await LBC.waitFor(() => [...document.querySelectorAll('[aria-label^="Choix"]')].find(e => want.test(e.getAttribute('aria-label'))), 20000);
    if (!cat) return 'ERR categorie (voulue ' + want + ', proposees: ' + [...document.querySelectorAll('[aria-label^="Choix"]')].map(e => e.getAttribute('aria-label')).join(' | ') + ')';
    const catLabel = cat.getAttribute('aria-label') || cat.innerText;
    LBC.click(cat);
    // photos
    const inp = await LBC.waitFor(() => document.querySelector('input[type=file]'));
    if (!inp) return 'ERR input photo';
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
    if ([...document.querySelectorAll('label')].some(l => /^Univers/.test(l.innerText.trim()))) {
      const u = { Hommes: 'Homme', Femmes: 'Femme', Enfants: 'Enfant' }[String(item.vcat).split('>')[0]];
      const got = await LBC.combo(/^Univers/, new RegExp('^' + u + '$'));
      log.push('univers:' + got); if (got !== u) throw 'ERR univers ' + got + ' au lieu de ' + u;
    }
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
  const items = await (await fetch(`https://raw.githubusercontent.com/thibaudmerlin-arch/photos-annonces/main/items.json?t=${Date.now()}`)).json();
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
    for (let att = 0; att < 2; att++) {
    let res = null, w = null;
    for (let tr = 0; tr < 4 && !w; tr++) {
      if (tr) { fr.remove(); fr = document.createElement('iframe'); fr.id = '__lbcFrame'; fr.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:99999;background:#fff;border:0'; document.body.appendChild(fr); await LBC.sleep(20000); }
      fr.src = 'https://www.leboncoin.fr/deposer-une-annonce?' + Date.now();
      await Promise.race([new Promise(r => { fr.onload = r; }), LBC.sleep(60000)]);
      await LBC.sleep(3500);
      try { if (fr.contentDocument && /leboncoin\.fr\/deposer/.test(fr.contentWindow.location.href)) w = fr.contentWindow; } catch (e) {}
    }
    if (!w) res = { ok: false, err: 'ERR page depot inaccessible (iframe bloque)' };
    else { w.eval(code); res = await Promise.race([w.LBC.runId(id, sha), LBC.sleep(420000).then(() => ({ ok: false, err: 'ERR timeout 7 min' }))]); }
    const entry = { id, ok: !!(res && res.ok), err: res && res.err, log: res && res.log, at: new Date().toISOString() };
    log.push(entry); localStorage.setItem('__lbcLog', JSON.stringify(log));
    window.__loopState.last = entry; window.__loopState.done++;
    if (entry.ok) break;
    // erreur apres le clic "Deposer" : ne pas retenter (risque de doublon), verif par mail
    if (/confirmation|timeout/.test(String(entry.err))) break;
    await LBC.sleep(30000); // nouvel essai
    }
    if (!window.__loopState.last.ok) window.__loopState.skipped = (window.__loopState.skipped || []).concat(id);
    await LBC.sleep(60000 + Math.floor(Math.random() * 120000)); // pause aleatoire 1 a 3 min
  }
  window.__loopState.running = false; return 'fini';
};

'LBC chargé';
