/* Boring Bogey Blueprint — dashboard. Reads data/rounds.json, builds #app. */
(function () {
  window.BBB = window.BBB || {};

  function delta(v) { return v === 0 ? 'E' : v > 0 ? '+' + v : '' + v; }

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
    if (series.length > 1) {
      var pts = [];
      for (var p = 0; p < series.length; p++) pts.push({ label: 'R' + series[p].seriesRound, value: series[p].score });
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
    h += '<span class="soon">More courses as we build them</span>';
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
