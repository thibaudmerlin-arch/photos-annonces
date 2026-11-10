// Passage d'anciennes annonces à Toulouse 31000 (édition officielle leboncoin, sans booster).
// Exécuté depuis une page www.leboncoin.fr ; l'édition se fait dans une iframe même origine.
window.LBE = {
  sleep: ms => new Promise(r => setTimeout(r, ms)),
  async waitFor(fn, timeout = 20000, step = 300) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) { let v; try { v = fn(); } catch (e) {} if (v) return v; await LBE.sleep(step); }
    return null;
  },
  setVal(w, el, val) {
    const proto = w.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
    el.dispatchEvent(new w.Event('input', { bubbles: true }));
    el.dispatchEvent(new w.Event('change', { bubbles: true }));
  },
  click(w, el) {
    ['pointerdown', 'mousedown', 'pointerup', 'mouseup'].forEach(t => el.dispatchEvent(new w.MouseEvent(t, { bubbles: true })));
    el.click();
  },
  // localisation publique actuelle d'une annonce (null si annonce introuvable)
  async publicLoc(id) {
    const r = await fetch(`/ad/vetements/${id}`, { cache: 'no-store' });
    if (!r.ok) return null;
    const m = (await r.text()).match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
    if (!m) return null;
    const ad = JSON.parse(m[1]).props.pageProps.ad;
    return ad ? { city: ad.location && ad.location.city_label, subject: ad.subject } : null;
  },
  async editOne(fr, id) {
    fr.src = `https://www.leboncoin.fr/annonce/${id}/editer?${Date.now()}`;
    await Promise.race([new Promise(r => { fr.onload = r; }), LBE.sleep(60000)]);
    await LBE.sleep(3000);
    let w; try { w = fr.contentWindow; if (!/\/editer/.test(w.location.href)) return 'ERR page edition inaccessible'; } catch (e) { return 'ERR iframe bloquee'; }
    const d = w.document;
    const addr = await LBE.waitFor(() => d.querySelector('input[name=location]'), 30000);
    if (!addr) return 'ERR champ localisation introuvable';
    if (!/Toulouse \(31000\)/.test(addr.value)) {
      addr.focus(); LBE.setVal(w, addr, ''); await LBE.sleep(400); LBE.setVal(w, addr, 'Toulouse 31000');
      const o = await LBE.waitFor(() => {
        const lb = addr.getAttribute('aria-controls') && d.getElementById(addr.getAttribute('aria-controls'));
        const opts = [...(lb ? lb.querySelectorAll('li,[role=option]') : []), ...d.querySelectorAll('[role=option]')];
        return opts.find(x => x.innerText.trim() === 'Toulouse (31000)');
      }, 10000);
      if (!o) return 'ERR option Toulouse (31000) introuvable';
      LBE.click(w, o); await LBE.sleep(1200);
    }
    if (!/Toulouse \(31000\)/.test(d.querySelector('input[name=location]').value)) return 'ERR adresse non appliquee';
    const liv = d.querySelector('[aria-label="Désactiver la livraison"]');
    if (!liv) return 'ERR livraison non active';
    const val = await LBE.waitFor(() => [...d.querySelectorAll('button')].find(b => /Valider les modifications/.test(b.innerText)), 10000);
    if (!val) return 'ERR bouton Valider introuvable';
    LBE.click(w, val);
    const nb = await LBE.waitFor(() => { try { return [...fr.contentDocument.querySelectorAll('button,a')].find(b => /Modifier sans booster/.test(b.innerText)); } catch (e) { return null; } }, 30000);
    if (!nb) { let t = ''; try { t = fr.contentDocument.body.innerText.slice(0, 200); } catch (e) {} return 'ERR page options: ' + t; }
    LBE.click(fr.contentWindow, nb);
    const ok = await LBE.waitFor(() => { try { return /editer\/confirmation/.test(fr.contentWindow.location.href); } catch (e) { return false; } }, 30000);
    return ok ? 'OK' : 'ERR confirmation absente';
  },
  // ids : liste candidate dans l'ordre ; max : nombre d'éditions réelles à faire
  async loop(ids, max = 10) {
    let fr = document.getElementById('__lbeFrame');
    if (!fr) { fr = document.createElement('iframe'); fr.id = '__lbeFrame'; fr.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:99999;background:#fff;border:0'; document.body.appendChild(fr); }
    const log = JSON.parse(localStorage.getItem('__lbeLog') || '[]');
    window.__lbeState = { running: true, done: 0, max, results: [] };
    for (const id of ids) {
      if (window.__lbeState.done >= max || window.__lbeStop) break;
      if (log.find(x => x.id === id && x.res === 'OK')) continue;
      const loc = await LBE.publicLoc(id); await LBE.sleep(1500);
      if (!loc) { window.__lbeState.results.push([id, 'introuvable']); continue; }
      if (/Toulouse/.test(loc.city || '')) { window.__lbeState.results.push([id, 'deja Toulouse']); continue; }
      const res = await Promise.race([LBE.editOne(fr, id), LBE.sleep(240000).then(() => 'ERR timeout 4 min')]);
      const entry = { id, subject: loc.subject, from: loc.city, res, at: new Date().toISOString() };
      log.push(entry); localStorage.setItem('__lbeLog', JSON.stringify(log));
      window.__lbeState.results.push([id, res]); window.__lbeState.done++;
      if (/inaccessible|bloquee/.test(res)) { window.__lbeState.blocked = true; break; }
      await LBE.sleep(60000 + Math.floor(Math.random() * 120000)); // pause 1 à 3 min
    }
    window.__lbeState.running = false; fr.remove(); return 'fini';
  },
};
'LBE chargé';
