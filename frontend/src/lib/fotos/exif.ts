export interface ExifExtraido {
  lat: number | null;
  lng: number | null;
  tomada_en: string | null;
}

/** Lee GPS y fecha del JPEG original antes de comprimir. Sin EXIF no es error. */
export async function extraerExif(blob: Blob): Promise<ExifExtraido | null> {
  try {
    const buf = await blob.slice(0, 128 * 1024).arrayBuffer();
    const v = new DataView(buf);

    if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return null;

    let off = 2;
    let tiffBase = -1;
    while (off + 4 < v.byteLength) {
      if (v.getUint8(off) !== 0xff) break;
      const marcador = v.getUint8(off + 1);
      const largo = v.getUint16(off + 2);
      if (marcador === 0xe1 && off + 10 < v.byteLength && v.getUint32(off + 4) === 0x45786966) {
        tiffBase = off + 10;
        break;
      }
      if (marcador === 0xda) break;
      off += 2 + largo;
    }
    if (tiffBase < 0 || tiffBase + 8 > v.byteLength) return null;

    const le = v.getUint16(tiffBase) === 0x4949;
    const u16 = (o: number) => v.getUint16(o, le);
    const u32 = (o: number) => v.getUint32(o, le);
    const ifd0 = tiffBase + u32(tiffBase + 4);

    const leerIfd = (ifd: number) => {
      const tags: Record<number, number> = {};
      if (ifd + 2 > v.byteLength) return tags;
      const n = u16(ifd);
      for (let i = 0; i < n; i++) {
        const e = ifd + 2 + i * 12;
        if (e + 12 > v.byteLength) break;
        tags[u16(e)] = e;
      }
      return tags;
    };

    const valorOffset = (e: number, bytes: number) => (bytes <= 4 ? e + 8 : tiffBase + u32(e + 8));

    const racionales = (e: number, n: number) => {
      const base = valorOffset(e, 8 * n);
      const out: number[] = [];
      for (let i = 0; i < n; i++) {
        const o = base + i * 8;
        if (o + 8 > v.byteLength) return null;
        const den = u32(o + 4);
        out.push(den ? u32(o) / den : 0);
      }
      return out;
    };

    const ascii = (e: number) => {
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
    const res: ExifExtraido = { lat: null, lng: null, tomada_en: null };

    if (t0[0x8769]) {
      const sub = leerIfd(tiffBase + u32(t0[0x8769] + 8));
      const eFecha = sub[0x9003] || sub[0x9004];
      if (eFecha) {
        const m = ascii(eFecha).match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
        if (m) res.tomada_en = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
      }
    }

    if (t0[0x8825]) {
      const gps = leerIfd(tiffBase + u32(t0[0x8825] + 8));
      const grados = (e: number) => {
        const r = racionales(e, 3);
        return r ? r[0] + r[1] / 60 + r[2] / 3600 : null;
      };
      if (gps[0x0002] && gps[0x0004]) {
        let lat = grados(gps[0x0002]);
        let lng = grados(gps[0x0004]);
        if (lat !== null && lng !== null && (lat !== 0 || lng !== 0)) {
          if (gps[0x0001] && ascii(gps[0x0001]).startsWith('S')) lat = -lat;
          if (gps[0x0003] && ascii(gps[0x0003]).startsWith('W')) lng = -lng;
          if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
            res.lat = lat;
            res.lng = lng;
          }
        }
      }
    }

    return res.lat !== null || res.tomada_en ? res : null;
  } catch {
    return null;
  }
}
