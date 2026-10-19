// Export: 3MF (Bambu Studio / Orca / Prusa), binary STL and SVG.
(function (root) {
  'use strict';

  // ---------- Minimal ZIP (no compression) ----------
  var CRC_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(u8) { var c = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function utf8(s) { return new TextEncoder().encode(s); }

  function zip(files) { // files: [{name, data: Uint8Array|string}]
    var parts = [], central = [], offset = 0;
    files.forEach(function (f) {
      var name = utf8(f.name), data = typeof f.data === 'string' ? utf8(f.data) : f.data, crc = crc32(data);
      var h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, 0, true); h.setUint16(12, 0x21, true); h.setUint32(14, crc, true);
      h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), name, data);
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint16(10, 0, true); c.setUint16(12, 0, true); c.setUint16(14, 0x21, true); c.setUint32(16, crc, true);
      c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true);
      c.setUint32(42, offset, true);
      central.push(new Uint8Array(c.buffer), name);
      offset += 30 + name.length + data.length;
    });
    var csize = central.reduce(function (a, b) { return a + b.length; }, 0);
    var e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, csize, true); e.setUint32(16, offset, true);
    var all = parts.concat(central, [new Uint8Array(e.buffer)]), len = all.reduce(function (a, b) { return a + b.length; }, 0);
    var out = new Uint8Array(len), o = 0;
    all.forEach(function (a) { out.set(a, o); o += a.length; });
    return out;
  }

  function f4(x) { return (Math.round(x * 10000) / 10000).toString(); }
  function meshXML(id, mesh, extra) {
    var s = [' <object id="' + id + '" type="model"' + (extra || '') + '>\n  <mesh>\n   <vertices>\n'];
    mesh.v.forEach(function (v) { s.push('    <vertex x="' + f4(v[0]) + '" y="' + f4(v[1]) + '" z="' + f4(v[2]) + '"/>\n'); });
    s.push('   </vertices>\n   <triangles>\n');
    mesh.t.forEach(function (t) { s.push('    <triangle v1="' + t[0] + '" v2="' + t[1] + '" v3="' + t[2] + '"/>\n'); });
    s.push('   </triangles>\n  </mesh>\n </object>\n');
    return s.join('');
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

  /**
   * 3MF with a Bambu Studio project structure (same as the Doodle Discs on MakerWorld).
   * opts.mode = 'parts'  → one object with 2 parts: disc (filament 1) and numbers (filament 2). For AMS.
   * opts.mode = 'layer'  → a single part + filament change where the numbers start (no AMS).
   * opts.partNames = [disc, numbers] and opts.designer: texts in the interface language.
   */
  function build3MF(meshes, opts) {
    var name = opts.name || 'disco';
    var today = new Date().toISOString().slice(0, 10);
    var NS = 'xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p"';
    var parts = opts.mode === 'layer'
      ? [{ name: name, mesh: new DDGeometry.Mesh().append(meshes.body).append(meshes.numbers), extruder: 1 }]
      : [{ name: opts.partNames ? opts.partNames[0] : 'Disco', mesh: meshes.body, extruder: 1 }, { name: opts.partNames ? opts.partNames[1] : 'Numeros', mesh: meshes.numbers, extruder: 2 }];
    var sub = '<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" ' + NS + '>\n <metadata name="BambuStudio:3mfVersion">1</metadata>\n <resources>\n';
    parts.forEach(function (pt, i) { sub += meshXML(i + 1, pt.mesh, ' p:UUID="' + uuid(i + 1) + '"'); });
    sub += ' </resources>\n <build/>\n</model>\n';
    var objId = parts.length + 1, cx = opts.bedCenter || 128;
    var main = '<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" ' + NS + '>\n' +
      ' <metadata name="Application">BambuStudio-02.00.00.00</metadata>\n <metadata name="BambuStudio:3mfVersion">1</metadata>\n' +
      ' <metadata name="Title">' + esc(name) + '</metadata>\n <metadata name="Designer">' + esc(opts.designer || 'Generador de discos rotatorios') + '</metadata>\n' +
      ' <metadata name="CreationDate">' + today + '</metadata>\n <metadata name="ModificationDate">' + today + '</metadata>\n' +
      ' <resources>\n  <object id="' + objId + '" p:UUID="' + uuid(100) + '" type="model">\n   <components>\n';
    parts.forEach(function (pt, i) {
      main += '    <component p:path="/3D/Objects/object_1.model" objectid="' + (i + 1) + '" p:UUID="' + uuid(200 + i) + '" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>\n';
    });
    main += '   </components>\n  </object>\n </resources>\n <build p:UUID="' + uuid(300) + '">\n' +
      '  <item objectid="' + objId + '" p:UUID="' + uuid(301) + '" transform="1 0 0 0 1 0 0 0 1 ' + cx + ' ' + cx + ' 0" printable="1"/>\n </build>\n</model>\n';
    var faces = parts.reduce(function (a, pt) { return a + pt.mesh.t.length; }, 0);
    var cfg = '<?xml version="1.0" encoding="UTF-8"?>\n<config>\n  <object id="' + objId + '">\n    <metadata key="name" value="' + esc(name) + '"/>\n    <metadata key="extruder" value="1"/>\n    <metadata face_count="' + faces + '"/>\n';
    parts.forEach(function (pt, i) {
      cfg += '    <part id="' + (i + 1) + '" subtype="normal_part">\n      <metadata key="name" value="' + esc(pt.name) + '"/>\n' +
        '      <metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>\n      <metadata key="extruder" value="' + pt.extruder + '"/>\n' +
        '      <mesh_stat face_count="' + pt.mesh.t.length + '" edges_fixed="0" degenerate_facets="0" facets_removed="0" facets_reversed="0" backwards_edges="0"/>\n    </part>\n';
    });
    cfg += '  </object>\n  <plate>\n    <metadata key="plater_id" value="1"/>\n    <metadata key="plater_name" value=""/>\n    <metadata key="locked" value="false"/>\n' +
      '    <model_instance>\n      <metadata key="object_id" value="' + objId + '"/>\n      <metadata key="instance_id" value="0"/>\n      <metadata key="identify_id" value="' + (objId + 100) + '"/>\n    </model_instance>\n  </plate>\n' +
      '  <assemble>\n   <assemble_item object_id="' + objId + '" instance_id="0" transform="1 0 0 0 1 0 0 0 1 ' + cx + ' ' + cx + ' 0" offset="0 0 0" />\n  </assemble>\n</config>\n';
    var files = [
      { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>\n <Default Extension="png" ContentType="image/png"/>\n <Default Extension="gcode" ContentType="text/x.gcode"/>\n</Types>\n' },
      { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>\n</Relationships>\n' },
      { name: '3D/3dmodel.model', data: main },
      { name: '3D/_rels/3dmodel.model.rels', data: '<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n <Relationship Target="/3D/Objects/object_1.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>\n</Relationships>\n' },
      { name: '3D/Objects/object_1.model', data: sub },
      { name: 'Metadata/model_settings.config', data: cfg }
    ];
    if (opts.mode === 'layer') {
      files.push({ name: 'Metadata/custom_gcode_per_layer.xml', data: '<?xml version="1.0" encoding="utf-8"?>\n<custom_gcodes_per_layer>\n<plate>\n<plate_info id="1"/>\n' +
        '<layer top_z="' + f4(opts.changeZ) + '" type="2" extruder="2" color="' + esc(opts.numColor || '#000000') + '" extra="" gcode="tool_change"/>\n<mode value="MultiAsSingle"/>\n</plate>\n</custom_gcodes_per_layer>\n' });
    }
    return zip(files);
  }
  function uuid(n) { var h = ('00000000' + n.toString(16)).slice(-8); return h + '-d15c-4000-8000-0000' + h; }

  function stl(mesh, name) {
    var n = mesh.t.length, buf = new ArrayBuffer(84 + 50 * n), dv = new DataView(buf), hdr = utf8((name || 'disco').slice(0, 79));
    new Uint8Array(buf).set(hdr, 0);
    dv.setUint32(80, n, true);
    var o = 84;
    mesh.t.forEach(function (t) {
      var a = mesh.v[t[0]], b = mesh.v[t[1]], c = mesh.v[t[2]];
      var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz) || 1;
      dv.setFloat32(o, nx / l, true); dv.setFloat32(o + 4, ny / l, true); dv.setFloat32(o + 8, nz / l, true); o += 12;
      [a, b, c].forEach(function (p) { dv.setFloat32(o, p[0], true); dv.setFloat32(o + 4, p[1], true); dv.setFloat32(o + 8, p[2], true); o += 12; });
      o += 2;
    });
    return new Uint8Array(buf);
  }

  // SVG (top view, coordinates in mm, useful for laser cutting or checking)
  function pathsToD(paths) {
    var SC = DDGeometry.SC;
    return paths.map(function (p) { return 'M' + p.map(function (q) { return (q.X / SC).toFixed(3) + ' ' + (-q.Y / SC).toFixed(3); }).join('L') + 'Z'; }).join('');
  }
  function svg(g, colors) {
    var R = g.R, s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + (2 * R) + 'mm" height="' + (2 * R) + 'mm" viewBox="' + (-R) + ' ' + (-R) + ' ' + (2 * R) + ' ' + (2 * R) + '">';
    s += '<path fill="' + colors.disc + '" fill-rule="evenodd" d="' + pathsToD(g.body) + '"/>';
    if (g.frame) s += '<path fill="rgba(0,0,0,.18)" d="' + pathsToD(g.frame) + '"/>';
    s += '<path fill="' + colors.num + '" d="' + pathsToD(g.numbers) + '"/></svg>';
    return s;
  }

  var api = { build3MF: build3MF, stl: stl, svg: svg, pathsToD: pathsToD, zip: zip };
  root.DDExport = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
