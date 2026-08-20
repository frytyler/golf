/* Boring Bogey Blueprint — tiny inline-SVG line chart. No external libs. */
(function () {
  window.BBB = window.BBB || {};

  // points: [{ label, value }]. Lower value sits lower (golf: down = better).
  BBB.lineChart = function (points, opts) {
    opts = opts || {};
    var W = 560, H = 220, padL = 40, padR = 18, padT = 18, padB = 34;
    if (!points || !points.length) return '<svg viewBox="0 0 ' + W + ' ' + H + '"></svg>';
    var vals = [];
    for (var i = 0; i < points.length; i++) vals.push(points[i].value);
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    if (min === max) { min -= 2; max += 2; }
    var innerW = W - padL - padR, innerH = H - padT - padB;
    function x(i) { return padL + (points.length === 1 ? innerW / 2 : innerW * i / (points.length - 1)); }
    function y(v) { return padT + innerH * (v - min) / (max - min); }

    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + (opts.aria || 'trend') + '">';
    // gridlines: min, mid, max
    var lines = [min, Math.round((min + max) / 2), max];
    for (var g = 0; g < lines.length; g++) {
      var gy = y(lines[g]);
      s += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy + '" stroke="rgba(245,240,228,.14)" stroke-width="1"/>';
      s += '<text x="' + (padL - 8) + '" y="' + (gy + 4) + '" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="11" fill="rgba(245,240,228,.55)">' + lines[g] + '</text>';
    }
    // path
    var d = '';
    for (var p = 0; p < points.length; p++) d += (p === 0 ? 'M' : 'L') + x(p).toFixed(1) + ' ' + y(points[p].value).toFixed(1) + ' ';
    s += '<path d="' + d + '" fill="none" stroke="#f2c14e" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
    // markers + value + x label
    for (var m = 0; m < points.length; m++) {
      var cx = x(m), cy = y(points[m].value);
      s += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="4.5" fill="#f2c14e"/>';
      s += '<text x="' + cx.toFixed(1) + '" y="' + (cy - 11).toFixed(1) + '" text-anchor="middle" font-family="Oswald, sans-serif" font-weight="700" font-size="15" fill="#f5f0e4">' + points[m].value + '</text>';
      s += '<text x="' + cx.toFixed(1) + '" y="' + (H - 12) + '" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="11" fill="rgba(245,240,228,.6)">' + points[m].label + '</text>';
    }
    s += '</svg>';
    return s;
  };
})();
