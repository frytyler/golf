/* Boring Bogey Blueprint — live round tracker. Reads CONFIG, runs after render. */
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

    function rec(n) { if (!state.h[n]) state.h[n] = { s: null, p: null, pen: false, adj: '' }; return state.h[n]; }
    function tgt(ho) { return ho && ho.target ? ho.target.score : (ho ? ho.par + 1 : 5); }
    function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

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
      var row = document.createElement('div');
      row.className = 'trk';
      row.setAttribute('data-hole', n);
      row.innerHTML =
        '<div class="trk-grp"><span class="trk-lab">Score</span>' +
          '<div class="stp"><button data-act="s-">−</button><span class="stv empty" data-v="s">·</span><button data-act="s+">+</button></div></div>' +
        '<div class="trk-grp"><span class="trk-lab">Putts</span>' +
          '<div class="stp"><button data-act="p-">−</button><span class="stv empty" data-v="p">·</span><button data-act="p+">+</button></div></div>' +
        '<button class="pen" data-act="pen" title="Penalty">&#9887;</button>' +
        '<input class="adj" data-adj placeholder="How #' + n + ' played: club, miss, lesson">';
      card.appendChild(row);
    }

    /* ---- interactions (event delegation on each row) ---- */
    function onAct(n, act) {
      var r = rec(n), ho = byNum[n];
      if (act === 's+') r.s = (r.s == null) ? tgt(ho) : clamp(r.s + 1, 1, 15);
      else if (act === 's-') r.s = (r.s == null) ? tgt(ho) : clamp(r.s - 1, 1, 15);
      else if (act === 'stap') { if (r.s == null) r.s = tgt(ho); }
      else if (act === 'p+') r.p = (r.p == null) ? 1 : clamp(r.p + 1, 0, 10);
      else if (act === 'p-') r.p = (r.p == null) ? 0 : clamp(r.p - 1, 0, 10);
      else if (act === 'pen') r.pen = !r.pen;
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

    /* ---- fixed summary bar ---- */
    var bar = document.createElement('div');
    bar.className = 'summary';
    bar.innerHTML =
      cell('thru', 'thru') + cell('score', 'score', true) + cell('vspar', 'vs par') +
      cell('vstgt', 'vs tgt') + cell('putts', 'putts') + cell('pen', 'pen');
    document.body.appendChild(bar);
    function cell(id, label, big) {
      return '<div class="cell' + (big ? ' big' : '') + '"><div class="cn" data-c="' + id + '">·</div><div class="cl">' + label + '</div></div>';
    }
    function delta(v) { return v === 0 ? 'E' : v > 0 ? '+' + v : '' + v; }
    function setDelta(id, v) {
      var el = bar.querySelector('[data-c="' + id + '"]');
      el.textContent = delta(v);
      el.className = 'cn' + (v > 0 ? ' over' : v < 0 ? ' under' : '');
    }

    /* ---- render / repaint ---- */
    function render() {
      var allRows = document.querySelectorAll('.trk[data-hole]');
      var thru = 0, score = 0, putts = 0, pen = 0, parPlayed = 0, tgtPlayed = 0;
      for (var i = 0; i < allRows.length; i++) {
        var row = allRows[i], n = parseInt(row.getAttribute('data-hole'), 10);
        var r = state.h[n], ho = byNum[n];
        var sv = row.querySelector('[data-v="s"]'), pv = row.querySelector('[data-v="p"]');
        var penBtn = row.querySelector('.pen'), adj = row.querySelector('[data-adj]');
        var s = r ? r.s : null, p = r ? r.p : null;
        if (s == null) { sv.textContent = '·'; sv.className = 'stv empty'; }
        else { sv.textContent = s; sv.className = 'stv'; }
        if (p == null) { pv.textContent = '·'; pv.className = 'stv empty'; }
        else { pv.textContent = p; pv.className = 'stv'; }
        if (penBtn) penBtn.className = 'pen' + (r && r.pen ? ' on' : '');
        if (adj) adj.value = (r && r.adj) ? r.adj : '';
        if (s != null) { thru++; score += s; parPlayed += ho.par; tgtPlayed += tgt(ho); }
        if (p != null) putts += p;
        if (r && r.pen) pen++;
      }
      bar.querySelector('[data-c="thru"]').textContent = thru;
      bar.querySelector('[data-c="score"]').textContent = thru ? score : '·';
      setDelta('vspar', score - parPlayed);
      setDelta('vstgt', score - tgtPlayed);
      bar.querySelector('[data-c="putts"]').textContent = putts;
      bar.querySelector('[data-c="pen"]').textContent = pen;
    }
    function commit() { save(); render(); }

    /* ---- exports ---- */
    function totalPar() { var t = 0; for (var i = 0; i < C.holes.length; i++) t += C.holes[i].par; return t; }
    function copyObsidian() {
      var played = 0, score = 0, tgtPlayed = 0;
      var scoreCells = [];
      for (var i = 0; i < C.holes.length; i++) {
        var ho = C.holes[i], r = state.h[ho.num];
        if (r && r.s != null) { played++; score += r.s; tgtPlayed += tgt(ho); scoreCells.push('' + r.s); }
        else scoreCells.push('–');
      }
      var complete = played === C.holes.length;
      var head = complete ? '(' + delta(score - totalPar()) + ')' : '(thru ' + played + ')';
      var putts = 0, pen = 0, comments = [];
      for (var j = 0; j < C.holes.length; j++) {
        var h2 = C.holes[j], r2 = state.h[h2.num];
        if (!r2) continue;
        if (r2.p != null) putts += r2.p;
        if (r2.pen) pen++;
        if (r2.adj) comments.push('  - **#' + h2.num + '** par ' + h2.par + ', ' + h2.yards + 'y, ' + (C.indexLabel || 'SI') + ' ' + h2.hcp + ' (' + (r2.s != null ? r2.s : '–') + ') · ' + r2.adj);
      }
      var T = (C.stats && C.stats[0]) ? parseInt(C.stats[0].n, 10) : totalPar() + 18;
      var out = '### ' + (C.logLabel || C.title) + ' · ' + (state.date || today()) + ' · ' + score + ' ' + head + '\n';
      out += '- Holes: `' + scoreCells.join(' · ') + '`\n';
      out += '- ' + putts + ' putts · ' + pen + ' penalties\n';
      out += '- vs target ' + T + ': ' + delta(score - tgtPlayed) + '\n';
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
        var blob = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
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
          state = d; if (!state.h) state.h = {};
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
