/** Límite del backend (`CrearReporteDto.direccion`). */
export const MAX_DIRECCION_REPORTE = 200;

interface NominatimAddress {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  footway?: string;
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  city_district?: string;
  hamlet?: string;
  city?: string;
  town?: string;
  municipality?: string;
  village?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

interface NominatimReverseResponse {
  display_name?: string;
  address?: NominatimAddress;
}

function recortarDireccion(texto: string): string {
  const limpio = texto.trim();
  if (limpio.length <= MAX_DIRECCION_REPORTE) return limpio;
  return limpio.slice(0, MAX_DIRECCION_REPORTE).trimEnd();
}

function normalizarBarrio(valor: string): string {
  return valor.replace(/^barrio\s+/i, '').trim();
}

/** Un solo barrio: el más específico, sin repetir variantes de OSM. */
function barrioPrincipal(address: NominatimAddress): string | null {
  const candidatos = [
    address.neighbourhood,
    address.suburb,
    address.quarter,
    address.city_district,
    address.hamlet,
  ]
    .filter((v): v is string => Boolean(v?.trim()))
    .map(normalizarBarrio)
    .filter(Boolean);

  const vistos = new Set<string>();
  for (const candidato of candidatos) {
    const clave = candidato.toLowerCase();
    if (!vistos.has(clave)) {
      vistos.add(clave);
      return candidato;
    }
  }

  return null;
}

function viaDesdeAddress(address: NominatimAddress): string | null {
  const calle = address.road ?? address.pedestrian ?? address.footway;
  if (!calle) return null;

  const numero = address.house_number?.trim();
  if (numero) {
    const separador = /[#-]/.test(numero) ? ' ' : ' # ';
    return `${calle}${separador}${numero}`;
  }

  return calle.trim();
}

function localidadDesdeAddress(address: NominatimAddress): string | null {
  return (
    address.city?.trim() ||
    address.town?.trim() ||
    address.municipality?.trim() ||
    address.village?.trim() ||
    null
  );
}

/** Dirección legible: vía, un barrio, municipio/ciudad, departamento. */
function direccionLegibleDesdeAddress(address: NominatimAddress): string | null {
  const partes = [
    viaDesdeAddress(address),
    barrioPrincipal(address),
    localidadDesdeAddress(address),
    address.state?.trim() || null,
  ].filter(Boolean);

  if (partes.length === 0) return null;
  return partes.join(', ');
}

/** Fallback cuando OSM solo entrega `display_name` con barrios repetidos. */
function direccionDesdeDisplayName(display: string): string {
  const partes = display
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  let barrioIncluido = false;
  const filtradas: string[] = [];

  for (const parte of partes) {
    if (/^\d{5,6}$/.test(parte)) continue;
    if (/^colombia$/i.test(parte)) continue;
    if (/^rap\b/i.test(parte)) continue;

    const esBarrio = /^barrio\s+/i.test(parte);
    if (esBarrio) {
      if (barrioIncluido) continue;
      barrioIncluido = true;
      filtradas.push(normalizarBarrio(parte));
      continue;
    }

    // Evitar repetir el mismo nombre de barrio sin prefijo "Barrio"
    if (barrioIncluido && filtradas.some((f) => f.toLowerCase() === parte.toLowerCase())) {
      continue;
    }

    filtradas.push(parte);
  }

  // Quitar departamento duplicado al final si ya hay municipio claro (opcional: mantener Valle del Cauca)
  return filtradas.join(', ');
}

export async function geocodificarInverso(lat: number, lng: number): Promise<{
  direccion: string | null;
  barrio: string | null;
}> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'json',
    addressdetails: '1',
    zoom: '18',
  });

  const respuesta = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'es',
    },
  });

  if (!respuesta.ok) {
    return { direccion: null, barrio: null };
  }

  const datos = (await respuesta.json()) as NominatimReverseResponse;
  const address = datos.address;

  if (address) {
    const barrio = barrioPrincipal(address);
    const direccion =
      recortarDireccion(direccionLegibleDesdeAddress(address) ?? '') ||
      (datos.display_name ? recortarDireccion(direccionDesdeDisplayName(datos.display_name)) : null);

    return { direccion: direccion || null, barrio };
  }

  if (datos.display_name?.trim()) {
    return {
      direccion: recortarDireccion(direccionDesdeDisplayName(datos.display_name)),
      barrio: null,
    };
  }

  return { direccion: null, barrio: null };
}
