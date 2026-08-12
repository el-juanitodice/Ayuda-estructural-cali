/**
 * Extractor mínimo de EXIF (GPS + fecha) del JPEG ORIGINAL.
 *
 * ¿Por qué existe? La compresión con canvas DESCARTA los metadatos, y el
 * esquema guarda `exif_geom` para corroborar que la foto se tomó en el predio.
 * Así que leemos GPS y fecha del archivo original ANTES de comprimir,
 * y los mandamos aparte en /fotos/confirmar.
 *
 * Es deliberadamente conservador: si cualquier cosa no cuadra devuelve null.
 * Una foto sin EXIF es normal (capturas, WhatsApp); nunca es un error.
 */

export async function extraerExif(blob) {
  try {
    // El EXIF vive en los primeros KB; 128 KB cubre cualquier APP1 real
    const buf = await blob.slice(0, 128 * 1024).arrayBuffer();
    const v = new DataView(buf);

    if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return null; // no es JPEG

    // Busca el segmento APP1 "Exif\0\0"
    let off = 2;
    let tiffBase = -1;
    while (off + 4 < v.byteLength) {
      if (v.getUint8(off) !== 0xff) break;
      const marcador = v.getUint8(off + 1);
      const largo = v.getUint16(off + 2);
      if (marcador === 0xe1 && off + 10 < v.byteLength && v.getUint32(off + 4) === 0x45786966) {
        tiffBase = off + 10; // tras "Exif\0\0"
        break;
      }
      if (marcador === 0xda) break; // empezó la imagen: ya no hay EXIF
      off += 2 + largo;
    }
    if (tiffBase < 0 || tiffBase + 8 > v.byteLength) return null;

    const le = v.getUint16(tiffBase) === 0x4949; // II = little endian
    const u16 = (o) => v.getUint16(o, le);
    const u32 = (o) => v.getUint32(o, le);

    const ifd0 = tiffBase + u32(tiffBase + 4);

    // Recorre un IFD y devuelve {tag: offsetDeEntrada}
    const leerIfd = (ifd) => {
      const tags = {};
      if (ifd + 2 > v.byteLength) return tags;
      const n = u16(ifd);
      for (let i = 0; i < n; i++) {
        const e = ifd + 2 + i * 12;
        if (e + 12 > v.byteLength) break;
        tags[u16(e)] = e;
      }
      return tags;
    };

    const valorOffset = (e, bytes) =>
      bytes <= 4 ? e + 8 : tiffBase + u32(e + 8);

    // rational[n] → número decimal
    const racionales = (e, n) => {
      const base = valorOffset(e, 8 * n);
      const out = [];
      for (let i = 0; i < n; i++) {
        const o = base + i * 8;
        if (o + 8 > v.byteLength) return null;
        const den = u32(o + 4);
        out.push(den ? u32(o) / den : 0);
      }
      return out;
    };

    const ascii = (e) => {
      const n = u32(e + 4);
      const base = valorOffset(e, n);
      let s = '';
      for (let i = 0; i < n && base + i < v.byteLength; i++) {
        const c = v.getUint8(base + i);
        if (c === 0) break;
        s += String.fromCharCode(c);
      }
      return s;
    };

    const t0 = leerIfd(ifd0);
    const res = { lat: null, lng: null, tomada_en: null };

    // Fecha: DateTimeOriginal vive en el sub-IFD EXIF (0x8769), tag 0x9003
    if (t0[0x8769]) {
      const sub = leerIfd(tiffBase + u32(t0[0x8769] + 8));
      const eFecha = sub[0x9003] || sub[0x9004];
      if (eFecha) {
        // "2026:08:12 14:03:22" → ISO local
        const m = ascii(eFecha).match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
        if (m) res.tomada_en = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
      }
    }

    // GPS: sub-IFD 0x8825; lat=0x0002/ref 0x0001, lng=0x0004/ref 0x0003
    if (t0[0x8825]) {
      const gps = leerIfd(tiffBase + u32(t0[0x8825] + 8));
      const grados = (e) => {
        const r = racionales(e, 3);
        return r ? r[0] + r[1] / 60 + r[2] / 3600 : null;
      };
      if (gps[0x0002] && gps[0x0004]) {
        let lat = grados(gps[0x0002]);
        let lng = grados(gps[0x0004]);
        if (lat !== null && lng !== null && (lat !== 0 || lng !== 0)) {
          if (gps[0x0001] && ascii(gps[0x0001]).startsWith('S')) lat = -lat;
          if (gps[0x0003] && ascii(gps[0x0003]).startsWith('W')) lng = -lng;
          // Cordura: coordenadas fuera de rango = EXIF corrupto
          if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
            res.lat = lat;
            res.lng = lng;
          }
        }
      }
    }

    return (res.lat !== null || res.tomada_en) ? res : null;
  } catch {
    return null; // EXIF corrupto o exótico: seguimos sin él
  }
}
