// Interface languages (English by default, Spanish). Strings may contain {variables}.
(function () {
  'use strict';
  var STR = {
    en: {
      'title': 'Rotating disc generator',
      'subtitle': 'Line illustration → 3D-printable rotating stencil disc',
      'lang.label': 'Language',
      'drop.title': 'Choose or drag an image',
      'drop.hint': 'Black line drawing on a white background (PNG/JPG)',
      'go': 'Generate disc',
      'busy': 'Generating…',
      'fs.disc': 'Disc',
      'diameter': 'Diameter (mm)',
      'thickness': 'Disc thickness (mm)',
      'numH': 'Number height (mm)<small>raised above the disc</small>',
      'discColor': 'Disc color',
      'numColor': 'Number color',
      'fs.drawing': 'Drawing',
      'autoSize': 'Automatic size',
      'sizeMm': 'Size (mm, longest side)',
      'rMin': 'Free radius at the center (mm)<small>the center barely turns; best left empty</small>',
      'autoDir': 'Automatic direction',
      'dirDeg': 'Direction (°)<small>90 = drawing above the center, 270 = below</small>',
      'autoOffset': 'Automatic offset',
      'offsetMm': 'Offset (mm)',
      'threshold': 'Black threshold (0-255)',
      'fillToOutline': 'Fills → outline only',
      'fs.slots': 'Slots',
      'slotW': 'Slot width (mm)<small>what the pencil draws</small>',
      'gap': 'Minimum bridge (mm)<small>material between slots</small>',
      'maxLen': 'Maximum length per slot (mm)',
      'maxPerPos': 'Max. slots per number<small>0 = no limit; 1 = like Dog Man (more positions)</small>',
      'advanced': 'Advanced',
      'fs.labels': 'Numbers and notches',
      'labelH': 'Number height next to slot (mm)',
      'rimNumH': 'Rim number height (mm)',
      'labelStroke': 'Stroke width (mm)<small>about 2× the nozzle width</small>',
      'labelClear': 'Number clearance (mm)<small>extra space between a number and other slots</small>',
      'tickLen': 'Notch length (mm)',
      'tickW': 'Notch width (mm)',
      'frame': 'Reference frame (position 1)',
      'fs.calc': 'Computation',
      'angleStep': 'Angle step (°)',
      'minSepDeg': 'Min. spacing between notches (°)<small>0 = automatic</small>',
      'tries': 'Attempts<small>more attempts = better layout, slower</small>',
      'fs.print': 'Printing',
      'firstLayer': 'First layer (mm)',
      'layerH': 'Layer height (mm)',
      'bed': 'Bed size (mm)',
      'tab.disc': 'Disc',
      'tab.sim': 'Simulation',
      'tab.vec': 'Vectorization',
      'tab.help': 'How to use',
      'placeholder': 'Load an image to start',
      'dl.3mf': 'Multicolor 3MF (AMS)',
      'dl.3mfLayer': '3MF with filament change by layer',
      'dl.stlBody': 'Disc STL',
      'dl.stlNum': 'Numbers STL',
      'dl.svg': 'SVG',
      'dl.zip': 'Everything in a ZIP',
      'play': '▶ Play',
      'stop': '■ Stop',
      'help':
        '<h3>How it works</h3>' +
        '<p>The drawing is reduced to its centerline and cut into pieces. Each piece becomes a slot in the disc, rotated to a different angle so that no slot touches another. Put notch <b>1</b> at the holder’s mark and fill in the slots with that number, then <b>2</b>, and so on, and the whole drawing appears on the paper.</p>' +
        '<h3>Using the disc</h3>' +
        '<p>Line up notch 1 with the top mark of the holder and completely fill every slot that has a 1 next to it (not just a thin line). Turn the disc clockwise to the next notch and repeat. The faint rectangular frame shows where the drawing will land when notch 1 is at the top.</p>' +
        '<h3>Printing in two colors</h3>' +
        '<p><b>Multicolor 3MF (AMS):</b> one object with two parts, “Disc” (filament 1) and “Numbers” (filament 2). Open it in Bambu Studio or Orca Slicer and check that each part has its filament.</p>' +
        '<p><b>3MF with layer change:</b> a single part with a filament change at the first layer that is numbers only (like the Doodle Discs on MakerWorld). For printers without AMS: the printer pauses and you swap the filament by hand.</p>' +
        '<p>The STL files come out separately in case you use another program. Everything is tuned for a 0.4 mm nozzle and 0.16 mm layers.</p>' +
        '<h3>Tips</h3>' +
        '<ul>' +
        '<li>Simple illustrations with an even stroke work best.</li>' +
        '<li>Whatever sits near the center of the disc barely moves when it turns, so slots are hard to spread out there. That’s why the app moves the busiest part of the drawing away from the center.</li>' +
        '<li>If some pieces don’t fit, shrink the drawing, increase the diameter, raise the free center radius or the attempts.</li>' +
        '<li>If the pencil doesn’t fit, increase the slot width; if bridges break, increase the minimum bridge.</li>' +
        '</ul>',
      'sim.blank': 'Blank paper',
      'sim.done': 'Complete drawing ({n} positions)',
      'sim.pos': 'Position {k} of {n}',
      'msg.error': 'Error: {msg}',
      'msg.noLines': 'No lines found. Try raising the black threshold.',
      'msg.near': 'The drawing comes within {r} mm of the center; there is little room near the center to spread slots out.',
      'msg.failed': '{n} piece(s) of the drawing don’t fit without touching other slots (shown in red in the simulation). Try {maxHint}more attempts, another direction, a smaller drawing, a bigger disc or a smaller minimum bridge.',
      'msg.failedMaxHint': 'a higher max. slots per number, ',
      'msg.missing': '{n} slot(s) without a number next to them for lack of space (positions {list}).',
      'msg.ok': 'Done: every slot fits and has its number.',
      'msg.saveFail': 'Couldn’t save the file ({code}).',
      'warn.shrunk': 'The drawing didn’t fit: it was reduced to {size} mm.',
      'warn.outside': 'With that offset the drawing leaves the usable area (r ≤ {r} mm).',
      'stat.positions': 'Positions',
      'stat.slots': 'Slots',
      'stat.drawing': 'Drawing',
      'stat.offset': 'Offset',
      'stat.disc': 'Disc',
      'sample.note': 'Sample: choose your own image to replace it.',
      'sample.name': 'sample_cat',
      'file.disc': 'disc',
      'file.numbers': 'numbers',
      'file.layer': 'layer_change',
      'part.disc': 'Disc',
      'part.numbers': 'Numbers'
    },
    es: {
      'title': 'Generador de discos rotatorios',
      'subtitle': 'Ilustración de línea → disco plantilla giratorio imprimible en 3D',
      'lang.label': 'Idioma',
      'drop.title': 'Elige o arrastra una imagen',
      'drop.hint': 'Dibujo de línea negra sobre fondo blanco (PNG/JPG)',
      'go': 'Generar disco',
      'busy': 'Generando…',
      'fs.disc': 'Disco',
      'diameter': 'Diámetro (mm)',
      'thickness': 'Grosor del disco (mm)',
      'numH': 'Altura de los números (mm)<small>en relieve sobre el disco</small>',
      'discColor': 'Color del disco',
      'numColor': 'Color de los números',
      'fs.drawing': 'Dibujo',
      'autoSize': 'Tamaño automático',
      'sizeMm': 'Tamaño (mm, lado mayor)',
      'rMin': 'Radio libre en el centro (mm)<small>el centro casi no gira; mejor dejarlo vacío</small>',
      'autoDir': 'Dirección automática',
      'dirDeg': 'Dirección (°)<small>90 = el dibujo queda arriba del centro, 270 = abajo</small>',
      'autoOffset': 'Desplazamiento automático',
      'offsetMm': 'Desplazamiento (mm)',
      'threshold': 'Umbral de negro (0-255)',
      'fillToOutline': 'Rellenos → sólo contorno',
      'fs.slots': 'Ranuras',
      'slotW': 'Ancho de ranura (mm)<small>lo que dibuja el lápiz</small>',
      'gap': 'Puente mínimo (mm)<small>material entre ranuras</small>',
      'maxLen': 'Largo máximo por ranura (mm)',
      'maxPerPos': 'Máx. ranuras por número<small>0 = sin límite; 1 = como el Dog Man (más posiciones)</small>',
      'advanced': 'Avanzado',
      'fs.labels': 'Números y muescas',
      'labelH': 'Altura número junto a ranura (mm)',
      'rimNumH': 'Altura número del borde (mm)',
      'labelStroke': 'Grosor del trazo (mm)<small>cerca de 2× el ancho de la boquilla</small>',
      'labelClear': 'Holgura de los números (mm)<small>espacio extra entre un número y las otras ranuras</small>',
      'tickLen': 'Largo de la muesca (mm)',
      'tickW': 'Ancho de la muesca (mm)',
      'frame': 'Marco de referencia (posición 1)',
      'fs.calc': 'Cálculo',
      'angleStep': 'Paso angular (°)',
      'minSepDeg': 'Separación mín. entre muescas (°)<small>0 = automática</small>',
      'tries': 'Intentos<small>más intentos = mejor reparto, más lento</small>',
      'fs.print': 'Impresión',
      'firstLayer': 'Primera capa (mm)',
      'layerH': 'Altura de capa (mm)',
      'bed': 'Tamaño de la cama (mm)',
      'tab.disc': 'Disco',
      'tab.sim': 'Simulación',
      'tab.vec': 'Vectorización',
      'tab.help': 'Cómo se usa',
      'placeholder': 'Carga una imagen para empezar',
      'dl.3mf': '3MF multicolor (AMS)',
      'dl.3mfLayer': '3MF con cambio de filamento por capa',
      'dl.stlBody': 'STL disco',
      'dl.stlNum': 'STL números',
      'dl.svg': 'SVG',
      'dl.zip': 'Todo en un ZIP',
      'play': '▶ Reproducir',
      'stop': '■ Detener',
      'help':
        '<h3>Cómo funciona</h3>' +
        '<p>El dibujo se reduce a su línea central y se corta en trozos. Cada trozo se convierte en una ranura del disco, girada a un ángulo distinto para que ninguna ranura toque a otra. Al poner la muesca <b>1</b> frente a la marca del soporte y rellenar las ranuras con ese número, luego la <b>2</b>, etc., aparece el dibujo completo en el papel.</p>' +
        '<h3>Uso del disco</h3>' +
        '<p>Alinea la muesca 1 con la marca superior del soporte y rellena por completo cada ranura que tenga un 1 al lado (no sólo un trazo fino). Gira el disco en sentido horario a la siguiente muesca y repite. El marco rectangular tenue muestra dónde quedará el dibujo cuando la muesca 1 está arriba.</p>' +
        '<h3>Imprimir con dos colores</h3>' +
        '<p><b>3MF multicolor (AMS):</b> un objeto con dos piezas, «Disco» (filamento 1) y «Numeros» (filamento 2). Ábrelo en Bambu Studio u Orca Slicer y revisa que cada pieza tenga su filamento.</p>' +
        '<p><b>3MF con cambio por capa:</b> una sola pieza con un cambio de filamento en la primera capa que es sólo números (como los Doodle Disc de MakerWorld). Sirve para impresoras sin AMS: la impresora se detiene y cambias el filamento a mano.</p>' +
        '<p>Los STL salen por separado por si usas otro programa. Todo está pensado para boquilla de 0,4 mm y capas de 0,16 mm.</p>' +
        '<h3>Consejos</h3>' +
        '<ul>' +
        '<li>Las ilustraciones sencillas, de trazo uniforme, funcionan mejor.</li>' +
        '<li>Lo que queda cerca del centro del disco casi no se mueve al girar, así que ahí cuesta repartir ranuras. Por eso la app aleja del centro la parte más cargada del dibujo.</li>' +
        '<li>Si aparecen trozos sin sitio, reduce el tamaño del dibujo, aumenta el diámetro, sube el radio libre del centro o los intentos.</li>' +
        '<li>Si el lápiz no entra, sube el ancho de ranura; si se rompen puentes, sube el puente mínimo.</li>' +
        '</ul>',
      'sim.blank': 'Papel en blanco',
      'sim.done': 'Dibujo completo ({n} posiciones)',
      'sim.pos': 'Posición {k} de {n}',
      'msg.error': 'Error: {msg}',
      'msg.noLines': 'No se encontraron líneas. Prueba a subir el umbral de negro.',
      'msg.near': 'El dibujo pasa a {r} mm del centro; cerca del centro hay poco sitio para repartir ranuras.',
      'msg.failed': '{n} trozo(s) del dibujo no caben sin tocar otras ranuras (marcados en rojo en la simulación). Prueba con {maxHint}más intentos, otra dirección, un dibujo más pequeño, un disco más grande o un puente mínimo menor.',
      'msg.failedMaxHint': 'un máximo mayor de ranuras por número, ',
      'msg.missing': '{n} ranura(s) sin número al lado por falta de espacio (posiciones {list}).',
      'msg.ok': 'Listo: todas las ranuras caben y tienen su número.',
      'msg.saveFail': 'No se pudo guardar el archivo ({code}).',
      'warn.shrunk': 'El dibujo no cabía: se redujo a {size} mm.',
      'warn.outside': 'Con ese desplazamiento el dibujo se sale de la zona útil (r ≤ {r} mm).',
      'stat.positions': 'Posiciones',
      'stat.slots': 'Ranuras',
      'stat.drawing': 'Dibujo',
      'stat.offset': 'Desplazamiento',
      'stat.disc': 'Disco',
      'sample.note': 'Ejemplo: elige tu propia imagen para reemplazarlo.',
      'sample.name': 'ejemplo_gato',
      'file.disc': 'disco',
      'file.numbers': 'numeros',
      'file.layer': 'cambio_capa',
      'part.disc': 'Disco',
      'part.numbers': 'Numeros'
    }
  };
  var KEY = 'dd-lang', listeners = [];

  function detect() {
    try { var saved = localStorage.getItem(KEY); if (STR[saved]) return saved; } catch (e) {}
    var nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
    return /^es\b/i.test(nav) ? 'es' : 'en';
  }
  var lang = detect();

  function t(key, vars) {
    var s = STR[lang][key];
    if (s == null) s = STR.en[key] != null ? STR.en[key] : key;
    return vars ? s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }) : s;
  }
  // data-i18n → textContent, data-i18n-html → innerHTML (strings with their own markup)
  function apply(root) {
    root = root || document;
    [].forEach.call(root.querySelectorAll('[data-i18n]'), function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    [].forEach.call(root.querySelectorAll('[data-i18n-html]'), function (el) { el.innerHTML = t(el.getAttribute('data-i18n-html')); });
    document.documentElement.lang = lang;
    document.title = t('title');
  }
  function setLang(l) {
    if (!STR[l] || l === lang) return;
    lang = l;
    try { localStorage.setItem(KEY, l); } catch (e) {}
    apply();
    listeners.forEach(function (f) { f(lang); });
  }

  window.DDI18n = {
    t: t, apply: apply, setLang: setLang,
    lang: function () { return lang; },
    onChange: function (f) { listeners.push(f); }
  };
})();
