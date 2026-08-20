/* Boring Bogey Blueprint — course-agnostic renderer. Reads a CONFIG, fills #app. */
(function () {
  window.BBB = window.BBB || {};

  var EXPAND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function holeCard(ho, C) {
    var cls = 'hole' + (ho.accent === 'hard' ? ' hard' : ho.accent === 'short' ? ' short' : '');
    var s = '<div class="' + cls + '">';
    var meta = 'Par <b>' + ho.par + '</b> · <b>' + ho.yards + '</b>y<br>' +
               (C.indexLabel || 'SI') + ' ' + ho.hcp + (ho.hcpNote ? ' · ' + ho.hcpNote : '');
    if (ho.alt) meta += '<br><span class="alt">' + ho.alt + '</span>';
    s += '<div class="htop"><div class="num">' + ho.num + '</div><div class="meta">' + meta + '</div>';
    if (ho.tag) s += '<span class="tag ' + ho.tag.type + '">' + ho.tag.text + '</span>';
    s += '</div>';
    s += '<div class="flow">';
    for (var i = 0; i < ho.steps.length; i++) {
      var st = ho.steps[i];
      var scls = 'step' + (st.wedge ? ' wedge' : '') + (st.note ? ' note' : '') + (st.tee2 ? ' tee2' : '');
      s += '<div class="' + scls + '"><span class="k">' + (st.k || '') + '</span><span class="v">' + st.v + '</span></div>';
    }
    s += '</div>';
    if (ho.target) {
      s += '<div class="target"><span class="lab">Target</span><span class="sc">' + ho.target.score + '</span>';
      if (ho.target.last != null) {
        s += '<span class="last">last: ' + ho.target.last + (ho.target.last < ho.par ? ' ★' : '') + '</span>';
      }
      s += '</div>';
    }
    s += '</div>';
    return s;
  }

  function wireLightbox(C) {
    var IMG = C.images;
    var lb = document.getElementById('lb');
    if (!lb) return;
    var lbImg = document.getElementById('lbImg'), lbH = document.getElementById('lbH'),
        lbMeta = document.getElementById('lbMeta'), lbNav = document.getElementById('lbNav'),
        lbFallback = document.getElementById('lbFallback');
    var current = 1;
    var nums = [];
    for (var q = 0; q < C.holes.length; q++) nums.push(C.holes[q].num);

    function holeImg(n) { return IMG.holePattern ? IMG.base + IMG.holePattern.replace('NN', pad(n)) : ''; }
    function findHole(n) { for (var i = 0; i < C.holes.length; i++) { if (C.holes[i].num === n) return C.holes[i]; } return null; }

    lbImg.addEventListener('error', function () {
      lbImg.style.display = 'none';
      lbFallback.innerHTML = "Couldn't load the photo. <a href='" + lbImg.src + "' target='_blank' rel='noopener'>Open in a new tab ↗</a>";
      lbFallback.style.display = 'block';
    });
    lbImg.addEventListener('load', function () { lbImg.style.display = 'block'; lbFallback.style.display = 'none'; });

    function show(src, alt) { lbFallback.style.display = 'none'; lbImg.style.display = 'block'; lbImg.alt = alt; lbImg.src = src; }
    function openLb() { lb.classList.add('open'); document.body.style.overflow = 'hidden'; }
    function closeLb() { lb.classList.remove('open'); document.body.style.overflow = ''; }
    function openHole(n) {
      current = n; var ho = findHole(n);
      lbH.innerHTML = 'Hole <b>' + n + '</b>';
      lbMeta.textContent = 'Par ' + ho.par + ' · ' + ho.yards + ' yds · ' + (IMG.tees || '');
      lbNav.classList.remove('hide');
      show(holeImg(n), 'Hole ' + n + ' layout'); openLb();
    }
    function openScorecard() {
      current = 0;
      lbH.innerHTML = 'Full <b>Scorecard</b>';
      lbMeta.textContent = 'All tees · Par ' + (IMG.par || '');
      lbNav.classList.add('hide');
      show(IMG.base + IMG.scorecard, 'Scorecard'); openLb();
    }
    function step(dir) {
      if (current < 1) return;
      var idx = nums.indexOf(current);
      idx = (idx + dir + nums.length) % nums.length;
      openHole(nums[idx]);
    }

    var scb = document.getElementById('scorecardBtn'); if (scb) scb.addEventListener('click', openScorecard);
    document.getElementById('lbClose').addEventListener('click', closeLb);
    document.getElementById('lbPrev').addEventListener('click', function () { step(-1); });
    document.getElementById('lbNext').addEventListener('click', function () { step(1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') closeLb();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    });

    var cards = document.querySelectorAll('.grid .hole');
    for (var i = 0; i < cards.length; i++) {
      (function (card) {
        var n = parseInt(card.querySelector('.num').textContent, 10);
        var b = document.createElement('button');
        b.className = 'viewbtn';
        b.innerHTML = EXPAND + '<span>View hole</span>';
        b.addEventListener('click', function () { openHole(n); });
        card.appendChild(b);
      })(cards[i]);
    }
  }

  BBB.render = function (C) {
    var app = document.getElementById('app');
    if (!app) return;
    var IMG = C.images || null;
    var h = '';
    h += '<header>';
    h += '<div class="eyebrow">' + C.eyebrow + '</div>';
    h += '<h1>' + C.title + '<span>' + C.accent + '</span></h1>';
    h += '<div class="sub">' + C.sub + '</div>';
    if (C.thesis) h += '<div class="thesis">' + C.thesis + '</div>';
    if (C.tempo) h += '<div class="tempo"><div class="lab">' + C.tempo.label + '</div><div class="word">' + C.tempo.word + '</div><div class="note">' + C.tempo.note + '</div></div>';
    if (IMG) h += '<button class="card-btn" id="scorecardBtn">' + EXPAND + ' View full scorecard</button>';
    if (C.bag && C.bag.length) {
      h += '<div class="bag"><div class="bag-title">' + (C.bagTitle || 'Your bag') + '</div><div class="clubs">';
      for (var i = 0; i < C.bag.length; i++) h += '<span class="club' + (C.bag[i].star ? ' star' : '') + '">' + C.bag[i].html + '</span>';
      h += '</div></div>';
    }
    if (C.stats && C.stats.length) {
      h += '<div class="score-strip">';
      for (var s = 0; s < C.stats.length; s++) h += '<div class="stat"><div class="n">' + C.stats[s].n + '</div><div class="l">' + C.stats[s].l + '</div></div>';
      h += '</div>';
    }
    h += '</header>';

    var nines = (C.nines && C.nines.length) ? C.nines : [{ label: C.nineLabel || '', total: C.nineTotal || '', start: 1 }];
    for (var ni = 0; ni < nines.length; ni++) {
      var startN = nines[ni].start;
      var endN = (ni + 1 < nines.length) ? nines[ni + 1].start : Infinity;
      h += '<div class="nine">' + nines[ni].label + '<span class="tot">' + nines[ni].total + '</span></div>';
      h += '<div class="grid">';
      for (var j = 0; j < C.holes.length; j++) {
        var ho = C.holes[j];
        if (ho.num < startN || ho.num >= endN) continue;
        h += holeCard(ho, C);
      }
      h += '</div>';
    }

    if (C.keys && C.keys.length) {
      h += '<div class="keys"><h2>' + (C.keysTitle || 'Keys') + '</h2>';
      for (var k = 0; k < C.keys.length; k++) h += '<div class="key"><div class="i">' + (k + 1) + '</div><div class="t">' + C.keys[k] + '</div></div>';
      h += '</div>';
    }
    if (C.footer) h += '<footer>' + C.footer + '</footer>';

    app.innerHTML = h;
    if (IMG) wireLightbox(C);
  };
})();
