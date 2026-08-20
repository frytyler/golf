/* Boring Bogey Blueprint — live round tracker + shot capture + insights.
   Reads CONFIG, runs after render. */
(function () {
  window.BBB = window.BBB || {};

  BBB.initTracker = function (C) {
    if (!C || !C.holes) return;
    var KEY = 'bbcaddy:v2:' + (C.slug || 'course');

    function today() {
      var d = new Date();
      function z(x) { return x < 10 ? '0' + x : '' + x; }
      return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
    }
    function load() { try { var s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
    function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

    var state = load() || { date: today(), h: {} };
    if (!state.h) state.h = {};

    var byNum = {};
    for (var i = 0; i < C.holes.length; i++) byNum[C.holes[i].num] = C.holes[i];

    function rec(n) { if (!state.h[n]) state.h[n] = { s: null, p: null, pen: false, fir: false, gir: false, adj: '' }; return state.h[n]; }
    function tgt(ho) { return ho && ho.target ? ho.target.score : (ho ? ho.par + 1 : 5); }
    function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
    function delta(v) { return v === 0 ? 'E' : v > 0 ? '+' + v : '' + v; }

    function toast(msg) {
      var t = document.createElement('div'); t.textContent = msg;
      t.style.cssText = "position:fixed;left:50%;bottom:100px;transform:translateX(-50%);" +
        "background:#245b47;color:#f5f0e4;font-family:'IBM Plex Mono',monospace;font-size:.8rem;" +
        "padding:9px 14px;border-radius:6px;z-index:1000;box-shadow:0 3px 12px rgba(0,0,0,.4)";
      document.body.appendChild(t); setTimeout(function () { t.remove(); }, 1900);
    }

    /* ---- build per-hole tracker rows ---- */
    var cards = document.querySelectorAll('.grid .hole');
    for (var c = 0; c < cards.length; c++) {
      var card = cards[c];
      var numEl = card.querySelector('.num');
      if (!numEl) continue;
      var n = parseInt(numEl.textContent, 10);
      var par = byNum[n] ? byNum[n].par : 4;
      var row = document.createElement('div');
      row.className = 'trk';
      row.setAttribute('data-hole', n);
      row.innerHTML =
        '<div class="trk-grp"><span class="trk-lab">Score</span>' +
          '<div class="stp"><button data-act="s-" aria-label="score down">&minus;</button><span class="stv empty" data-v="s">&middot;</span><button data-act="s+" aria-label="score up">+</button></div></div>' +
        '<div class="trk-grp"><span class="trk-lab">Putts</span>' +
          '<div class="stp"><button data-act="p-" aria-label="putts down">&minus;</button><span class="stv empty" data-v="p">&middot;</span><button data-act="p+" aria-label="putts up">+</button></div></div>' +
        '<div class="tgls">' +
          (par >= 4 ? '<button class="tgl" data-act="fir" title="Fairway hit">FIR</button>' : '') +
          '<button class="tgl" data-act="gir" title="Green in regulation">GIR</button>' +
          '<button class="tgl pen" data-act="pen" title="Penalty stroke">PEN</button>' +
        '</div>' +
        '<input class="adj" data-adj placeholder="How #' + n + ' played: club, miss, lesson">';
      card.appendChild(row);
    }

    function onAct(n, act) {
      var r = rec(n), ho = byNum[n];
      if (act === 's+') r.s = (r.s == null) ? tgt(ho) : clamp(r.s + 1, 1, 15);
      else if (act === 's-') r.s = (r.s == null) ? tgt(ho) : clamp(r.s - 1, 1, 15);
      else if (act === 'stap') { if (r.s == null) r.s = tgt(ho); }
      else if (act === 'p+') r.p = (r.p == null) ? 1 : clamp(r.p + 1, 0, 10);
      else if (act === 'p-') r.p = (r.p == null) ? 0 : clamp(r.p - 1, 0, 10);
      else if (act === 'pen') r.pen = !r.pen;
      else if (act === 'fir') r.fir = !r.fir;
      else if (act === 'gir') r.gir = !r.gir;
      commit();
    }

    var rows = document.querySelectorAll('.trk');
    for (var ri = 0; ri < rows.length; ri++) {
      (function (row) {
        var n = parseInt(row.getAttribute('data-hole'), 10);
        row.addEventListener('click', function (e) {
          var b = e.target.closest ? e.target.closest('[data-act]') : null;
          if (b && row.contains(b)) { onAct(n, b.getAttribute('data-act')); return; }
          var v = e.target.closest ? e.target.closest('[data-v="s"]') : null;
          if (v && row.contains(v)) onAct(n, 'stap');
        });
        var adj = row.querySelector('[data-adj]');
        adj.addEventListener('input', function () { rec(n).adj = adj.value; save(); });
      })(rows[ri]);
    }

    /* ---- tools row (before first .nine) ---- */
    var tools = document.createElement('div');
    tools.className = 'tools';
    tools.innerHTML =
      '<button class="prime" data-t="copy">Copy for Obsidian</button>' +
      '<button data-t="save">Save backup</button>' +
      '<label>Restore<input type="file" accept=".json,application/json" data-t="file"></label>' +
      '<button class="tReset" data-t="reset">Reset round</button>';
    var firstNine = document.querySelector('.nine');
    if (firstNine && firstNine.parentNode) firstNine.parentNode.insertBefore(tools, firstNine);
    tools.querySelector('[data-t="copy"]').addEventListener('click', copyObsidian);
    tools.querySelector('[data-t="save"]').addEventListener('click', saveBackup);
    tools.querySelector('[data-t="reset"]').addEventListener('click', resetRound);
    tools.querySelector('[data-t="file"]').addEventListener('change', restore);

    /* ---- insights card (before footer) ---- */
    var ins = document.createElement('div');
    ins.className = 'insights';
    ins.id = 'insights';
    var footer = document.querySelector('footer');
    if (footer && footer.parentNode) footer.parentNode.insertBefore(ins, footer);
    else document.querySelector('.wrap').appendChild(ins);

    /* ---- fixed summary bar (tap to jump to insights) ---- */
    var bar = document.createElement('div');
    bar.className = 'summary';
    bar.innerHTML =
      cell('thru', 'thru') + cell('score', 'score', true) + cell('vspar', 'vs par') +
      cell('vstgt', 'vs tgt') + cell('putts', 'putts') + cell('pen', 'pen');
    document.body.appendChild(bar);
    bar.addEventListener('click', function () { if (ins) ins.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    function cell(id, label, big) {
      return '<div class="cell' + (big ? ' big' : '') + '"><div class="cn" data-c="' + id + '">&middot;</div><div class="cl">' + label + '</div></div>';
    }
    function setDelta(id, v, played) {
      var el = bar.querySelector('[data-c="' + id + '"]');
      el.textContent = played ? delta(v) : '·';
      el.className = 'cn' + (played && v > 0 ? ' over' : played && v < 0 ? ' under' : '');
    }

    /* ---- compute + render ---- */
    function compute() {
      var r = { thru: 0, score: 0, putts: 0, puttsHoles: 0, threePutts: 0, pen: 0,
        parPlayed: 0, tgtPlayed: 0, firHit: 0, firElig: 0, girHit: 0,
        scrOpp: 0, scrSave: 0, byPar: {}, worst: null };
      for (var i = 0; i < C.holes.length; i++) {
        var ho = C.holes[i], h = state.h[ho.num];
        if (!h || h.s == null) continue;
        r.thru++; r.score += h.s; r.parPlayed += ho.par; r.tgtPlayed += tgt(ho);
        if (h.p != null) { r.putts += h.p; r.puttsHoles++; if (h.p >= 3) r.threePutts++; }
        if (h.pen) r.pen++;
        if (ho.par >= 4) { r.firElig++; if (h.fir) r.firHit++; }
        if (h.gir) r.girHit++; else { r.scrOpp++; if (h.s <= ho.par) r.scrSave++; }
        if (!r.byPar[ho.par]) r.byPar[ho.par] = { n: 0, over: 0 };
        r.byPar[ho.par].n++; r.byPar[ho.par].over += (h.s - ho.par);
        var over = h.s - tgt(ho);
        if (!r.worst || over > r.worst.over) r.worst = { num: ho.num, over: over, s: h.s, par: ho.par };
      }
      return r;
    }

    function tile(n, l) { return '<div class="ins-tile"><div class="itn">' + n + '</div><div class="itl">' + l + '</div></div>'; }
    function pct(a, b) { return b ? Math.round(100 * a / b) + '%' : '–'; }

    function renderInsights(r) {
      if (!r.thru) {
        ins.innerHTML = '<h2>This round</h2><div class="ins-empty">Tap in scores as you play and your round takes shape here: fairways, greens, putts, and where the strokes are going.</div>';
        return;
      }
      var girPct = pct(r.girHit, r.thru);
      var firPct = pct(r.firHit, r.firElig);
      var scrPct = pct(r.scrSave, r.scrOpp);
      var pph = r.puttsHoles ? (r.putts / r.puttsHoles).toFixed(1) : '–';
      var h = '<h2>This round <span class="ins-thru">thru ' + r.thru + '</span></h2>';
      h += '<div class="ins-grid">';
      h += tile(r.score, 'score');
      h += tile(delta(r.score - r.parPlayed), 'vs par');
      h += tile(delta(r.score - r.tgtPlayed), 'vs target');
      h += tile(firPct, 'fairways (' + r.firHit + '/' + r.firElig + ')');
      h += tile(girPct, 'greens (' + r.girHit + '/' + r.thru + ')');
      h += tile(r.putts, 'putts (' + pph + '/hole)');
      h += tile(r.threePutts, '3-putts');
      h += tile(scrPct, 'scramble (' + r.scrSave + '/' + r.scrOpp + ')');
      h += tile(r.pen, 'penalties');
      h += '</div>';
      // leak by par
      var leak = [];
      [3, 4, 5].forEach(function (p) {
        if (r.byPar[p]) { var avg = r.byPar[p].over / r.byPar[p].n; leak.push('Par ' + p + ' <b>' + (avg >= 0 ? '+' : '') + avg.toFixed(1) + '</b>'); }
      });
      var leakStr = leak.join(' &nbsp;·&nbsp; ');
      if (r.worst) leakStr += ' &nbsp;·&nbsp; Toughest so far <b>#' + r.worst.num + '</b> (' + delta(r.worst.over) + ' vs tgt)';
      h += '<div class="ins-leak">Where the strokes go: ' + leakStr + '</div>';
      ins.innerHTML = h;
    }

    function render() {
      var allRows = document.querySelectorAll('.trk[data-hole]');
      for (var i = 0; i < allRows.length; i++) {
        var row = allRows[i], n = parseInt(row.getAttribute('data-hole'), 10);
        var r = state.h[n], ho = byNum[n];
        var sv = row.querySelector('[data-v="s"]'), pv = row.querySelector('[data-v="p"]');
        var penBtn = row.querySelector('[data-act="pen"]'), firBtn = row.querySelector('[data-act="fir"]'),
            girBtn = row.querySelector('[data-act="gir"]'), adj = row.querySelector('[data-adj]');
        var s = r ? r.s : null, p = r ? r.p : null;
        if (s == null) { sv.textContent = '·'; sv.className = 'stv empty'; }
        else {
          sv.textContent = s;
          var cls = s <= ho.par ? 'stv sc-under' : s <= tgt(ho) ? 'stv sc-on' : 'stv sc-over';
          sv.className = cls;
        }
        if (p == null) { pv.textContent = '·'; pv.className = 'stv empty'; }
        else { pv.textContent = p; pv.className = 'stv' + (p >= 3 ? ' sc-over' : ''); }
        if (penBtn) penBtn.className = 'tgl pen' + (r && r.pen ? ' on' : '');
        if (firBtn) firBtn.className = 'tgl' + (r && r.fir ? ' on' : '');
        if (girBtn) girBtn.className = 'tgl' + (r && r.gir ? ' on' : '');
        if (adj) adj.value = (r && r.adj) ? r.adj : '';
      }
      var r2 = compute();
      var played = r2.thru > 0;
      bar.querySelector('[data-c="thru"]').textContent = r2.thru;
      bar.querySelector('[data-c="score"]').textContent = played ? r2.score : '·';
      setDelta('vspar', r2.score - r2.parPlayed, played);
      setDelta('vstgt', r2.score - r2.tgtPlayed, played);
      bar.querySelector('[data-c="putts"]').textContent = r2.putts;
      bar.querySelector('[data-c="pen"]').textContent = r2.pen;
      renderInsights(r2);
    }
    function commit() { save(); render(); }

    /* ---- exports ---- */
    function totalPar() { var t = 0; for (var i = 0; i < C.holes.length; i++) t += C.holes[i].par; return t; }
    function copyObsidian() {
      var r = compute();
      var scoreCells = [];
      for (var i = 0; i < C.holes.length; i++) {
        var ho = C.holes[i], rr = state.h[ho.num];
        scoreCells.push(rr && rr.s != null ? '' + rr.s : '–');
      }
      var complete = r.thru === C.holes.length;
      var head = complete ? '(' + delta(r.score - totalPar()) + ')' : '(thru ' + r.thru + ')';
      var comments = [];
      for (var j = 0; j < C.holes.length; j++) {
        var h2 = C.holes[j], r2 = state.h[h2.num];
        if (r2 && r2.adj) comments.push('  - **#' + h2.num + '** par ' + h2.par + ', ' + h2.yards + 'y, ' + (C.indexLabel || 'SI') + ' ' + h2.hcp + ' (' + (r2.s != null ? r2.s : '–') + ') · ' + r2.adj);
      }
      var T = (C.stats && C.stats[0]) ? parseInt(C.stats[0].n, 10) : totalPar() + 18;
      var pph = r.puttsHoles ? (r.putts / r.puttsHoles).toFixed(1) : '0';
      var out = '### ' + (C.logLabel || C.title) + ' · ' + (state.date || today()) + ' · ' + r.score + ' ' + head + '\n';
      out += '- Holes: `' + scoreCells.join(' · ') + '`\n';
      out += '- ' + r.putts + ' putts (' + pph + '/hole) · ' + r.threePutts + ' three-putts · ' + r.pen + ' penalties\n';
      out += '- FIR ' + pct(r.firHit, r.firElig) + ' (' + r.firHit + '/' + r.firElig + ') · GIR ' + pct(r.girHit, r.thru) + ' (' + r.girHit + '/' + r.thru + ') · scramble ' + pct(r.scrSave, r.scrOpp) + '\n';
      out += '- vs target ' + T + ': ' + delta(r.score - r.tgtPlayed) + '\n';
      if (comments.length) out += '- How it played:\n' + comments.join('\n') + '\n';
      copyText(out);
    }
    function copyText(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { toast('Copied for Obsidian'); }, function () { fallbackCopy(text); });
      } else fallbackCopy(text);
    }
    function fallbackCopy(text) {
      try {
        var ta = document.createElement('textarea'); ta.value = text;
        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
        document.body.appendChild(ta); ta.focus(); ta.select();
        var ok = document.execCommand('copy'); ta.remove();
        if (ok) { toast('Copied for Obsidian'); return; }
      } catch (e) {}
      window.prompt('Copy this round:', text);
    }
    function slug(s) { return (s || 'round').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
    function saveBackup() {
      try {
        var name = slug(C.logLabel || C.title) + '-' + (state.date || today()) + '.bbround.json';
        var out = { date: state.date || today(), course: C.slug, logLabel: C.logLabel || C.title, h: state.h };
        var blob = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(out, null, 2));
        var a = document.createElement('a'); a.href = blob; a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        toast('Backup saved');
      } catch (e) { toast('Save not supported here'); }
    }
    function restore(e) {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        try {
          var d = JSON.parse(fr.result);
          if (!d || !d.h) { toast('Not a round file'); return; }
          state = { date: d.date || today(), h: d.h };
          save(); render(); toast('Round restored');
        } catch (err) { toast("Couldn't read file"); }
        e.target.value = '';
      };
      fr.onerror = function () { toast("Couldn't read file"); e.target.value = ''; };
      fr.readAsText(f);
    }
    function resetRound() {
      if (!window.confirm('Reset this round? A saved backup file is not affected.')) return;
      state = { date: today(), h: {} };
      save(); render(); toast('Round reset');
    }

    render();
  };
})();
