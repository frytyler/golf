/* Boring Bogey Blueprint — dashboard. Reads data/rounds.json, builds #app. */
(function () {
  window.BBB = window.BBB || {};

  function delta(v) { return v === 0 ? 'E' : v > 0 ? '+' + v : '' + v; }
  function tileD(n, l) { return '<div class="ins-tile"><div class="itn">' + n + '</div><div class="itl">' + l + '</div></div>'; }

  function byDateDesc(a, b) {
    var da = a.date || '', db = b.date || '';
    if (da && db) return da < db ? 1 : da > db ? -1 : 0;
    if (da && !db) return -1;
    if (!da && db) return 1;
    return 0;
  }

  function roundCard(r) {
    var dateStr = r.date || (r.dateApprox ? r.dateApprox + ' (approx)' : 'date unknown');
    var seg = r.holes + 'h' + (r.segment === 'front' ? ' front' : r.segment === 'back' ? ' back' : '');
    var s = '<div class="rd">';
    s += '<span class="rd-score">' + r.score + '</span>';
    s += '<span class="rd-par">' + (typeof r.toPar === 'number' ? '+' + r.toPar + ' · ' : '') + 'par ' + r.par + '</span>';
    s += '<span class="rd-course">' + r.courseName + '</span>';
    if (r.partial) s += '<span class="rd-flag">partial</span>';
    s += '<span class="rd-meta">' + dateStr + ' · ' + seg + (r.tees ? ' · ' + r.tees + ' tees' : '') + '</span>';
    if (r.note) s += '<span class="rd-note">' + r.note + '</span>';
    s += '</div>';
    return s;
  }

  function build(app, rounds) {
    var h = '';
    h += '<header>';
    h += '<div class="eyebrow">The Boring Bogey Blueprint</div>';
    h += '<h1>Bogey Log<span>Every Round</span></h1>';
    h += '<div class="sub">Bogey, not par. Advance to a wedge. One ball in play. Watch the progression.</div>';
    h += '</header>';

    var series = [];
    for (var i = 0; i < rounds.length; i++) if (rounds[i].series === 'stonebridge-front') series.push(rounds[i]);
    series.sort(function (a, b) { return (a.seriesRound || 0) - (b.seriesRound || 0); });

    var best18 = null;
    for (var b = 0; b < rounds.length; b++) { var rd = rounds[b]; if (rd.holes === 18 && (best18 == null || rd.score < best18)) best18 = rd.score; }
    var frontVals = [];
    for (var f = 0; f < series.length; f++) frontVals.push(series[f].seriesValue != null ? series[f].seriesValue : series[f].score);
    var bestFront = frontVals.length ? Math.min.apply(null, frontVals) : null;
    var gain = frontVals.length ? frontVals[0] - bestFront : null;
    var gainStr = gain == null ? '' : gain > 0 ? '−' + gain : gain < 0 ? '+' + (-gain) : 'E';
    h += '<div class="dash-sec"><h2>At a glance</h2><div class="ins-grid">';
    h += tileD(rounds.length, 'rounds logged');
    if (best18 != null) h += tileD(best18, 'best 18');
    if (bestFront != null) h += tileD(bestFront, 'best front 9');
    if (gain != null) h += tileD(gainStr, 'front 9 vs first');
    h += '</div></div>';

    if (series.length > 1) {
      var pts = [];
      for (var p = 0; p < series.length; p++) {
        var val = series[p].seriesValue != null ? series[p].seriesValue : series[p].score;
        pts.push({ label: 'R' + series[p].seriesRound, value: val });
      }
      h += '<div class="dash-sec"><h2>Progression</h2>';
      h += '<div class="chart-card"><div class="ct">Stonebridge front 9, by round (lower is better)</div>';
      h += BBB.lineChart(pts, { aria: 'Stonebridge front nine scores by round' });
      h += '</div></div>';
    }

    var all = rounds.slice().sort(byDateDesc);
    h += '<div class="dash-sec"><h2>Rounds</h2><div class="rounds">';
    for (var j = 0; j < all.length; j++) h += roundCard(all[j]);
    h += '</div></div>';

    h += '<div class="dash-sec"><h2>Course cards</h2><div class="course-links">';
    h += '<a href="./courses/stonebridge.html">Stonebridge · Full 18</a>';
    h += '<a href="./courses/manderley.html">Manderley · South 9</a>';
    h += '<a href="./courses/marchwood.html">Marchwood · Par 3s</a>';
    h += '<span class="soon">The Canadian · coming soon</span>';
    h += '</div></div>';

    h += '<footer>Built with Claude Code · scores from Tyler\'s cards · dates marked approx or unknown where not recorded</footer>';

    app.innerHTML = h;
  }

  BBB.initDashboard = function () {
    var app = document.getElementById('app');
    if (!app) return;
    fetch('./data/rounds.json').then(function (r) { return r.json(); }).then(function (data) {
      build(app, (data && data.rounds) || []);
    }).catch(function () {
      app.innerHTML = '<p style="font-family:IBM Plex Mono,monospace;padding:20px">Could not load rounds.json.</p>';
    });
  };
})();
