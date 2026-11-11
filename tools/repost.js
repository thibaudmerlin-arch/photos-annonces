// Remise en vente leboncoin (consigne Thibaud) : supprimer l'ancienne annonce (motif « Autre »),
// vérifier qu'elle est hors ligne (HTTP 410/404), puis publier la nouvelle version via LBC (lbc.js).
// À exécuter depuis https://www.leboncoin.fr/compte/part/mes-annonces. Jamais de doublon :
// la nouvelle annonce n'est déposée que si l'ancienne est confirmée hors ligne.
window.LBR = {
  S: ms => new Promise(r => setTimeout(r, ms)),
  tclick(el) {
    const r = el.getBoundingClientRect();
    const o = { bubbles: true, cancelable: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: 1 };
    el.dispatchEvent(new PointerEvent('pointerover', o)); el.dispatchEvent(new PointerEvent('pointerenter', o)); el.dispatchEvent(new MouseEvent('mouseover', o));
    el.dispatchEvent(new PointerEvent('pointerdown', o)); el.dispatchEvent(new MouseEvent('mousedown', o)); el.focus && el.focus();
    el.dispatchEvent(new PointerEvent('pointerup', { ...o, buttons: 0 })); el.dispatchEvent(new MouseEvent('mouseup', { ...o, buttons: 0 })); el.dispatchEvent(new MouseEvent('click', { ...o, buttons: 0 }));
  },
  async status(id) { const r = await fetch(`/ad/vetements/${id}`, { cache: 'no-store', credentials: 'omit' }); return r.status; },
  async delOld(id) {
    const S = LBR.S;
    let a;
    for (let i = 0; i < 50; i++) {
      a = document.querySelector(`a[href*="${id}"]`); if (a) break;
      const ls = [...document.querySelectorAll('a[href*="/ad/"]')]; ls.at(-1)?.scrollIntoView();
      window.scrollTo(0, document.body.scrollHeight); window.dispatchEvent(new Event('scroll')); await S(1200);
    }
    if (!a) return 'ERR introuvable';
    a.scrollIntoView({ block: 'center' }); await S(500);
    let card = a; for (let i = 0; i < 10 && card; i++) { if ([...card.querySelectorAll('button')].length >= 2) break; card = card.parentElement; }
    const sb = [...card.querySelectorAll('button')].find(b => /Supprimer/.test(b.innerText)); if (!sb) return 'ERR bouton Supprimer';
    LBR.tclick(sb); await S(2000);
    let d = document.querySelector('[role=dialog]'); if (!d) return 'ERR pas de dialogue';
    LBR.tclick([...d.querySelectorAll('button')].find(b => b.innerText.trim() === 'Valider')); await S(2000);
    d = document.querySelector('[role=dialog]'); if (!d) return 'ERR dialogue motif absent';
    const rads = [...d.querySelectorAll('[role=radio]')];
    const rad = rads.find(b => /Autre/.test(b.getAttribute('aria-label') || b.parentElement.innerText || '')) || rads.at(-1);
    LBR.tclick(rad); await S(800);
    if (rad.getAttribute('aria-checked') !== 'true') return 'ERR motif non coché';
    LBR.tclick([...d.querySelectorAll('button')].find(b => b.innerText.trim() === 'Valider')); await S(3500);
    for (let k = 0; k < 6; k++) { const st = await LBR.status(id); if (st === 410 || st === 404) return 'OK ' + st; await S(5000); }
    return 'ERR ancienne encore en ligne';
  },
  // pairs : [[ancienId, nouvelIdItems], ...]
  async run(pairs, sha) {
    const log = JSON.parse(localStorage.getItem('__repostLog') || '[]');
    window.__repostState = { running: true, done: 0, total: pairs.length, res: [] };
    for (const [oldId, newId] of pairs) {
      if (window.__repostStop) break;
      if (log.find(x => x.newId === newId && x.pub === 'PUBLIE')) continue;
      const prev = log.find(x => x.oldId === oldId && /^OK/.test(x.del || ''));
      let del = prev ? prev.del : null;
      if (!del) {
        const st = await LBR.status(oldId);
        del = (st === 410 || st === 404) ? 'OK deja hors ligne ' + st : await LBR.delOld(oldId);
        if (!/^OK/.test(del)) { location.hash = ''; window.scrollTo(0, 0); await LBR.S(8000); const st2 = await LBR.status(oldId); del = (st2 === 410 || st2 === 404) ? 'OK (2e essai) ' + st2 : await LBR.delOld(oldId); }
      }
      const entry = { oldId, newId, del, pub: null, at: new Date().toISOString() };
      if (/^OK/.test(del)) {
        localStorage.removeItem('__lbcLog_tmp');
        const res = await LBC.loop([newId], sha, 0);
        const last = window.__loopState && window.__loopState.last;
        entry.pub = last && last.ok ? 'PUBLIE' : 'ECHEC ' + (last && (last.err || '')).slice(0, 120);
      }
      log.push(entry); localStorage.setItem('__repostLog', JSON.stringify(log));
      window.__repostState.res.push(entry); window.__repostState.done++;
      if (!/^OK/.test(del) || entry.pub !== 'PUBLIE') { window.__repostState.blocked = true; break; }
    }
    window.__repostState.running = false; return 'fini';
  },
};
'LBR chargé';
