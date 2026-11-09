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
    const cat = await LBC.waitFor(() => LBC.byText('button,[role=button]', /^Choix 1/));
    if (!cat) return 'ERR categorie';
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
    LBC.setVal(ta, item.desc);
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
'LBC chargé';
