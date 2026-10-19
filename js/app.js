// Interfaz: carga de imagen, parámetros, vistas previas y descargas.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var state = { gray: null, W: 0, H: 0, name: 'disco', vec: null, result: null };
  var D2R = Math.PI / 180;

  // ---------- Parámetros ----------
  function num(id) { return parseFloat($(id).value); }
  function chk(id) { return $(id).checked; }
  function params() {
    var p = {
      diameter: num('diameter'), thickness: num('thickness'), numH: num('numH'),
      slotW: num('slotW'), gap: num('gap'), maxLen: num('maxLen'), maxPerPos: Math.max(0, Math.round(num('maxPerPos'))),
      labelH: num('labelH'), rimNumH: num('rimNumH'), labelStroke: num('labelStroke'),
      tickLen: num('tickLen'), tickW: num('tickW'), frame: chk('frame'),
      angleStep: num('angleStep'), tries: Math.max(1, Math.round(num('tries'))),
      labelMargin: 0.5, frameW: 0.6, frameDepth: 0.16, reuseBonus: 1.5,
      sizeMm: num('sizeMm'), autoSize: chk('autoSize'), rMin: num('rMin'), dirDeg: num('dirDeg'), autoDir: chk('autoDir'),
      offsetMm: chk('autoOffset') ? null : num('offsetMm'),
      threshold: num('threshold'), fillToOutline: chk('fillToOutline'),
      firstLayer: num('firstLayer'), layerH: num('layerH'), bed: num('bed'),
      discColor: $('discColor').value, numColor: $('numColor').value
    };
    var R = p.diameter / 2;
    p.rimZone = p.tickLen + 1.4 + p.rimNumH + 0.8;              // franja exterior para muescas y números
    p.rMax = R - p.rimZone - 0.5;                                 // radio máximo para las ranuras
    var rnInner = R - p.tickLen - 1.4 - p.rimNumH;
    var autoSep = (DDGeometry.textWidth('88', p.rimNumH, p.labelStroke) + 1.0) / rnInner / D2R;
    p.minSepDeg = num('minSepDeg') > 0 ? num('minSepDeg') : Math.ceil(autoSep * 2) / 2;
    p.labelBox = [DDGeometry.textWidth('88', p.labelH, p.labelStroke) + 0.3, p.labelH + 0.3];
    return p;
  }

  // ---------- Imagen ----------
  function ingest(source, w, h, name, thumbUrl, note) {
    var max = 1000, s = Math.min(1, max / Math.max(w, h));
    var W = Math.round(w * s), H = Math.round(h * s);
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    ctx.drawImage(source, 0, 0, W, H);
    var d = ctx.getImageData(0, 0, W, H).data, g = new Uint8Array(W * H);
    for (var i = 0; i < W * H; i++) g[i] = Math.round(0.299 * d[4 * i] + 0.587 * d[4 * i + 1] + 0.114 * d[4 * i + 2]);
    state.gray = g; state.W = W; state.H = H; state.img = source; state.name = name;
    $('thumb').src = thumbUrl; $('thumb').hidden = false;
    $('thumbNote').textContent = note || ''; $('thumbNote').hidden = !note;
    $('go').disabled = false;
    generate();
  }
  function loadFile(f) {
    if (!f || !/^image\//.test(f.type)) return;
    var name = f.name.replace(/\.[^.]+$/, '').replace(/[^\w\-]+/g, '_') || 'disco';
    var url = URL.createObjectURL(f), img = new Image();
    img.onload = function () { ingest(img, img.width, img.height, name, url, ''); };
    img.src = url;
  }
  // Dibujo de ejemplo (un gato) para que la página abra mostrando un disco
  function loadSample() {
    var c = document.createElement('canvas'); c.width = 800; c.height = 640;
    var x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, 800, 640);
    x.strokeStyle = '#000'; x.fillStyle = '#000'; x.lineWidth = 9; x.lineCap = x.lineJoin = 'round';
    function P(f) { x.beginPath(); f(); x.stroke(); }
    P(function () { x.ellipse(400, 250, 170, 140, 0, 0, Math.PI * 2); });                       // cabeza
    P(function () { x.moveTo(265, 170); x.lineTo(250, 50); x.lineTo(345, 120); });              // oreja izq.
    P(function () { x.moveTo(535, 170); x.lineTo(550, 50); x.lineTo(455, 120); });              // oreja der.
    P(function () { x.ellipse(335, 235, 26, 34, 0, 0, Math.PI * 2); });                         // ojos
    P(function () { x.ellipse(465, 235, 26, 34, 0, 0, Math.PI * 2); });
    x.beginPath(); x.arc(340, 242, 10, 0, 7); x.fill(); x.beginPath(); x.arc(470, 242, 10, 0, 7); x.fill();
    P(function () { x.moveTo(385, 290); x.lineTo(415, 290); x.lineTo(400, 308); x.closePath(); }); // nariz
    P(function () { x.moveTo(400, 308); x.quadraticCurveTo(395, 335, 370, 335); });             // boca
    P(function () { x.moveTo(400, 308); x.quadraticCurveTo(405, 335, 430, 335); });
    P(function () { x.moveTo(300, 300); x.lineTo(180, 285); x.moveTo(300, 315); x.lineTo(185, 330); });   // bigotes
    P(function () { x.moveTo(500, 300); x.lineTo(620, 285); x.moveTo(500, 315); x.lineTo(615, 330); });
    P(function () { x.moveTo(300, 370); x.quadraticCurveTo(250, 520, 290, 600); x.lineTo(510, 600); x.quadraticCurveTo(550, 520, 500, 370); }); // cuerpo
    P(function () { x.moveTo(370, 600); x.lineTo(370, 540); x.moveTo(430, 600); x.lineTo(430, 540); });   // patas
    P(function () { x.moveTo(510, 590); x.bezierCurveTo(650, 600, 700, 480, 640, 420); });      // cola
    ingest(c, 800, 640, 'ejemplo_gato', c.toDataURL(), 'Ejemplo: elige tu propia imagen para reemplazarlo.');
  }
  var drop = $('drop');
  drop.addEventListener('click', function () { $('file').click(); });
  $('file').addEventListener('change', function (e) { loadFile(e.target.files[0]); });
  ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (e) { loadFile(e.dataTransfer.files[0]); });

  // ---------- Generación ----------
  var vecKey = null;
  function generate() {
    if (!state.gray) return;
    $('busy').hidden = false; $('go').disabled = true;
    setTimeout(function () {
      try { run(); } catch (err) { console.error(err); showMessages([{ cls: 'bad', txt: 'Error: ' + err.message }]); }
      $('busy').hidden = true; $('go').disabled = false;
    }, 30);
  }

  function run() {
    var p = params(), msgs = [];
    var key = p.threshold + '|' + p.fillToOutline + '|' + state.W + 'x' + state.H + '|' + state.name;
    if (vecKey !== key) {
      state.vec = DDVectorize.vectorize(state.gray, state.W, state.H, { threshold: p.threshold, fillToOutline: p.fillToOutline });
      vecKey = key;
    }
    if (!state.vec.polylines.length) { showMessages([{ cls: 'bad', txt: 'No se encontraron líneas. Prueba a subir el umbral de negro.' }]); return; }
    function place(dir) {
      return DDLayout.placeDrawing(state.vec.polylines, {
        sizeMm: p.sizeMm, autoSize: p.autoSize, rMin: p.rMin, rMax: p.rMax, dirDeg: dir, offsetMm: p.offsetMm, slotW: p.slotW
      });
    }
    var pd, lay;
    if (p.autoDir) {
      // Prueba el dibujo arriba, abajo y a los lados del centro y se queda con el que reparte mejor:
      // lo que queda cerca del centro casi no se mueve al girar, así que conviene alejar la parte más cargada.
      var best = null;
      [90, 270, 0, 180].forEach(function (dir) {
        var pdi = place(dir), li = DDLayout.layoutBest(pdi.polylines, p, p.tries);
        var sc = li.score - pdi.sizeMm * 2;
        if (!best || sc < best.sc) best = { sc: sc, dir: dir, pd: pdi, lay: li };
      });
      $('dirDeg').value = best.dir;
      pd = best.pd; lay = best.lay;
    } else {
      pd = place(p.dirDeg);
      lay = DDLayout.layoutBest(pd.polylines, p, p.tries);
    }
    if (p.autoSize) {
      // Si faltan sitios o números, se achica un poco el dibujo y se reintenta
      var dirUsed = p.autoDir ? +$('dirDeg').value : p.dirDeg;
      for (var shrink = 0; shrink < 4 && (lay.failed.length || lay.noLabel); shrink++) {
        var pd2 = DDLayout.placeDrawing(state.vec.polylines, { sizeMm: pd.sizeMm - 1.5, autoSize: false, rMax: p.rMax, dirDeg: dirUsed, offsetMm: p.offsetMm, slotW: p.slotW });
        var lay2 = DDLayout.layoutBest(pd2.polylines, p, p.tries);
        if (lay2.score <= lay.score) { pd = pd2; lay = lay2; } else break;
      }
      $('sizeMm').value = pd.sizeMm;
    }
    if (p.offsetMm == null) $('offsetMm').value = pd.offset.toFixed(1);
    if (pd.warn) msgs.push({ cls: 'warn', txt: pd.warn });
    if (!p.autoSize && pd.rMinActual < p.rMin) msgs.push({ cls: 'warn', txt: 'El dibujo pasa a ' + Math.max(0, pd.rMinActual).toFixed(1) + ' mm del centro; cerca del centro hay poco sitio para repartir ranuras.' });

    var g = DDGeometry.build2D(lay, pd.bbox, p);
    var meshes = DDGeometry.build3D(g, p);
    state.result = { p: p, pd: pd, lay: lay, g: g, meshes: meshes };

    if (lay.failed.length) msgs.push({ cls: 'bad', txt: lay.failed.length + ' trozo(s) del dibujo no caben sin tocar otras ranuras (marcados en rojo en la simulación). Prueba con ' + (p.maxPerPos > 0 ? 'un máximo mayor de ranuras por número, ' : '') + 'más intentos, otra dirección, un dibujo más pequeño, un disco más grande o un puente mínimo menor.' });
    if (g.missingLabels.length) msgs.push({ cls: 'warn', txt: g.missingLabels.length + ' ranura(s) sin número al lado por falta de espacio (posiciones ' + uniq(g.missingLabels).join(', ') + ').' });
    if (!lay.failed.length && !g.missingLabels.length) msgs.push({ cls: 'ok', txt: 'Listo: todas las ranuras caben y tienen su número.' });
    showMessages(msgs);
    $('stats').innerHTML = [
      ['Posiciones', lay.positions.length], ['Ranuras', lay.pieces.length],
      ['Dibujo', pd.sizeMm.toFixed(1) + ' mm'], ['Desplazamiento', pd.offset.toFixed(1) + ' mm'],
      ['Disco', p.diameter + ' mm × ' + (p.thickness + p.numH).toFixed(2) + ' mm']
    ].map(function (a) { return '<span>' + a[0] + ': <b>' + a[1] + '</b></span>'; }).join('');
    drawDisc(); drawVec(); setupSim();
    ['dl3mf', 'dl3mfLayer', 'dlStlBody', 'dlStlNum', 'dlSvg', 'dlZip'].forEach(function (id) { $(id).disabled = false; });
  }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }).sort(function (x, y) { return x - y; }); }
  function showMessages(m) { $('messages').innerHTML = m.map(function (x) { return '<div class="msg ' + x.cls + '">' + x.txt + '</div>'; }).join(''); }

  // ---------- Vistas ----------
  function drawDisc() {
    var r = state.result, R = r.g.R, m = 4;
    var svg = DDExport.svg(r.g, { disc: r.p.discColor, num: r.p.numColor });
    svg = svg.replace(/width="[^"]+" height="[^"]+" viewBox="[^"]+"/, 'viewBox="' + (-R - m) + ' ' + (-R - m) + ' ' + (2 * R + 2 * m) + ' ' + (2 * R + 2 * m) + '"');
    // marca de "arriba" del soporte
    svg = svg.replace('</svg>', '<path d="M0 ' + (-R - 0.6) + ' l-2 -3 h4 z" fill="currentColor" opacity=".6"/></svg>');
    $('discStage').innerHTML = svg;
  }

  function drawVec() {
    var c = $('vecCanvas'), v = state.vec, ctx = c.getContext('2d');
    var s = Math.min(c.width / state.W, c.height / state.H);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.globalAlpha = 0.35; ctx.drawImage(state.img, 0, 0, state.W * s, state.H * s); ctx.globalAlpha = 1;
    v.polylines.forEach(function (pl, i) {
      ctx.strokeStyle = ctx.fillStyle = 'hsl(' + ((i * 47) % 360) + ',80%,45%)';
      ctx.lineWidth = 2.5;
      if (pl.length === 1) { ctx.beginPath(); ctx.arc(pl[0][0] * s, pl[0][1] * s, 3, 0, 7); ctx.fill(); return; }
      ctx.beginPath(); pl.forEach(function (q, k) { k ? ctx.lineTo(q[0] * s, q[1] * s) : ctx.moveTo(q[0] * s, q[1] * s); }); ctx.stroke();
    });
  }

  // Simulación: el papel queda fijo; el disco gira a cada posición
  var simTimer = null;
  function setupSim() {
    var n = state.result.lay.positions.length;
    $('simStep').max = n + 1; $('simStep').value = n + 1;
    drawSim(n + 1);
  }
  function drawSim(k) {
    var r = state.result, c = $('simCanvas'), ctx = c.getContext('2d'), R = r.g.R, p = r.p;
    var sc = c.width / (2 * R + 10), cx = c.width / 2, cy = c.height / 2;
    function X(q) { return cx + q[0] * sc; } function Y(q) { return cy - q[1] * sc; }
    var cs = getComputedStyle(document.documentElement), tok = function (n) { return cs.getPropertyValue(n).trim(); };
    var dark = cs.colorScheme === 'dark' || (tok('--trace').toLowerCase() === '#f2f2f2');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = tok('--paper'); ctx.fillRect(0, 0, c.width, c.height);
    var recon = DDLayout.reconstruct(r.lay.pieces, r.lay.positions);
    ctx.lineCap = ctx.lineJoin = 'round'; ctx.lineWidth = p.slotW * sc;
    recon.forEach(function (pc) {
      if (pc.pos > k) return;
      ctx.strokeStyle = ctx.fillStyle = pc.pos === k && k <= r.lay.positions.length ? '#e4572e' : tok('--trace');
      path(pc.pts);
    });
    // trozos que no cupieron
    ctx.strokeStyle = ctx.fillStyle = 'rgba(220,38,38,.9)';
    r.lay.failed.forEach(function (f) { path(f.pts); });
    function path(pts) {
      if (pts.length === 1) { ctx.beginPath(); ctx.arc(X(pts[0]), Y(pts[0]), p.slotW * sc / 2, 0, 7); ctx.fill(); return; }
      ctx.beginPath(); pts.forEach(function (q, i) { i ? ctx.lineTo(X(q), Y(q)) : ctx.moveTo(X(q), Y(q)); }); ctx.stroke();
    }
    if (k >= 1 && k <= r.lay.positions.length) {
      // disco girado θ_k: un punto del disco q aparece en R(θ)·q
      var th = r.lay.positions[k - 1].theta * D2R;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-th);
      ctx.globalAlpha = 0.18; ctx.fillStyle = p.discColor;
      ctx.beginPath(); ctx.arc(0, 0, R * sc, 0, 7);
      ctx.fill(); ctx.globalAlpha = 0.55; ctx.strokeStyle = p.discColor; ctx.lineWidth = 2; ctx.stroke();
      ctx.globalAlpha = 0.9; ctx.lineWidth = 1;
      r.lay.pieces.forEach(function (pc) {
        ctx.strokeStyle = pc.pos === k ? '#e4572e' : (dark ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.25)');
        ctx.lineWidth = pc.pos === k ? 2 : 1;
        ctx.beginPath(); pc.disc.forEach(function (q, i) { var x = q[0] * sc, y = -q[1] * sc; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
      });
      ctx.restore();
    }
    // marca superior del soporte
    ctx.fillStyle = tok('--ink');
    ctx.beginPath(); ctx.moveTo(cx, cy - R * sc - 2); ctx.lineTo(cx - 9, cy - R * sc - 16); ctx.lineTo(cx + 9, cy - R * sc - 16); ctx.fill();
    $('simLabel').textContent = k === 0 ? 'Papel en blanco' : (k > r.lay.positions.length ? 'Dibujo completo (' + r.lay.positions.length + ' posiciones)' : 'Posición ' + k + ' de ' + r.lay.positions.length);
  }
  $('simStep').addEventListener('input', function () { stopPlay(); drawSim(+this.value); });
  function stopPlay() { if (simTimer) { clearInterval(simTimer); simTimer = null; $('play').textContent = '▶ Reproducir'; } }
  $('play').addEventListener('click', function () {
    if (!state.result) return;
    if (simTimer) { stopPlay(); return; }
    var k = 0, n = state.result.lay.positions.length;
    $('play').textContent = '■ Detener';
    simTimer = setInterval(function () { $('simStep').value = k; drawSim(k); k++; if (k > n + 1) stopPlay(); }, 700);
  });

  // ---------- Pestañas ----------
  $('tabs').addEventListener('click', function (e) {
    var t = e.target.getAttribute('data-tab'); if (!t) return;
    [].forEach.call(document.querySelectorAll('#tabs button'), function (b) { b.classList.toggle('on', b === e.target); });
    [].forEach.call(document.querySelectorAll('[data-pane]'), function (pn) { pn.hidden = pn.getAttribute('data-pane') !== t; });
  });

  // ---------- Descargas ----------
  // En claude.ai las descargas pasan por la capacidad "downloads", que no acepta .3mf/.stl:
  // esos archivos se entregan dentro de un .zip. Abierta como archivo local, descarga directa.
  var dlCap = null, ALLOWED = /\.(svg|zip|png|json|txt)$/i;
  if (window.claude && window.claude.use) window.claude.use('downloads').then(function (d) { dlCap = d; }).catch(function () {});
  function save(data, name, type) {
    if (dlCap) {
      if (!ALLOWED.test(name)) { data = DDExport.zip([{ name: name, data: data }]); name = name + '.zip'; }
      dlCap.save({ filename: name, data: data }).catch(function (e) {
        if (e && e.code !== 'declined') showMessages([{ cls: 'warn', txt: 'No se pudo guardar el archivo (' + (e.code || 'error') + ').' }]);
      });
      return;
    }
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: type }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function fileBase() { return state.name + '_disco_' + state.result.p.diameter + 'mm'; }
  function changeZ(p) {
    // primera capa que ya es sólo números (su mitad queda por encima del disco)
    var z = p.firstLayer;
    while (z - p.layerH / 2 < p.thickness - 1e-9) z += p.layerH;
    return Math.round(z * 1000) / 1000;
  }
  $('dl3mf').addEventListener('click', function () {
    var r = state.result;
    save(DDExport.build3MF(r.meshes, { mode: 'parts', name: fileBase(), bedCenter: r.p.bed / 2 }), fileBase() + '_AMS.3mf', 'model/3mf');
  });
  $('dl3mfLayer').addEventListener('click', function () {
    var r = state.result;
    save(DDExport.build3MF(r.meshes, { mode: 'layer', name: fileBase(), bedCenter: r.p.bed / 2, changeZ: changeZ(r.p), numColor: r.p.numColor }), fileBase() + '_cambio_capa.3mf', 'model/3mf');
  });
  $('dlStlBody').addEventListener('click', function () { save(DDExport.stl(state.result.meshes.body, 'disco'), fileBase() + '_disco.stl', 'model/stl'); });
  $('dlStlNum').addEventListener('click', function () { save(DDExport.stl(state.result.meshes.numbers, 'numeros'), fileBase() + '_numeros.stl', 'model/stl'); });
  $('dlSvg').addEventListener('click', function () {
    var r = state.result;
    save(DDExport.svg(r.g, { disc: r.p.discColor, num: r.p.numColor }), fileBase() + '.svg', 'image/svg+xml');
  });

  $('dlZip').addEventListener('click', function () {
    var r = state.result, b = fileBase();
    save(DDExport.zip([
      { name: b + '_AMS.3mf', data: DDExport.build3MF(r.meshes, { mode: 'parts', name: b, bedCenter: r.p.bed / 2 }) },
      { name: b + '_cambio_capa.3mf', data: DDExport.build3MF(r.meshes, { mode: 'layer', name: b, bedCenter: r.p.bed / 2, changeZ: changeZ(r.p), numColor: r.p.numColor }) },
      { name: b + '_disco.stl', data: DDExport.stl(r.meshes.body, 'disco') },
      { name: b + '_numeros.stl', data: DDExport.stl(r.meshes.numbers, 'numeros') },
      { name: b + '.svg', data: DDExport.svg(r.g, { disc: r.p.discColor, num: r.p.numColor }) }
    ]), b + '.zip', 'application/zip');
  });
  $('go').addEventListener('click', generate);
  // los colores sólo cambian la vista previa
  ['discColor', 'numColor'].forEach(function (id) { $(id).addEventListener('input', function () { if (state.result) { state.result.p.discColor = $('discColor').value; state.result.p.numColor = $('numColor').value; drawDisc(); drawSim(+$('simStep').value); } }); });
  $('autoSize').addEventListener('change', function () { $('sizeMm').disabled = this.checked; });
  $('autoOffset').addEventListener('change', function () { $('offsetMm').disabled = this.checked; });
  $('autoDir').addEventListener('change', function () { $('dirDeg').disabled = this.checked; });
  $('sizeMm').disabled = true; $('offsetMm').disabled = true; $('dirDeg').disabled = true;
  window.DDApp = { state: state, loadFile: loadFile, generate: generate };
  loadSample();
})();
