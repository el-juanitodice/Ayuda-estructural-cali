/** Límite del backend (`CrearReporteDto.direccion`). */
export const MAX_DIRECCION_REPORTE = 200;

interface NominatimReverseResponse {
  display_name?: string;
  address?: {
    road?: string;
    house_number?: string;
    pedestrian?: string;
    footway?: string;
    suburb?: string;
    neighbourhood?: string;
    quarter?: string;
    city_district?: string;
  };
}

function direccionCortaDesdeAddress(address: NonNullable<NominatimReverseResponse['address']>): string | null {
  const calle = address.road ?? address.pedestrian ?? address.footway;
  if (!calle) return null;

  const numero = address.house_number?.trim();
  if (numero) {
    const separador = /[#-]/.test(numero) ? ' ' : ' # ';
    return `${calle}${separador}${numero}`;
  }

  return calle;
}

function barrioDesdeAddress(address: NonNullable<NominatimReverseResponse['address']>): string | null {
  const barrio =
    address.neighbourhood ??
    address.suburb ??
    address.quarter ??
    address.city_district ??
    null;

  return barrio?.trim() || null;
}

function recortarDireccion(texto: string): string {
  const limpio = texto.trim();
  if (limpio.length <= MAX_DIRECCION_REPORTE) return limpio;
  return limpio.slice(0, MAX_DIRECCION_REPORTE).trimEnd();
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

  const direccionCompleta = datos.display_name?.trim();
  const direccion =
    (direccionCompleta ? recortarDireccion(direccionCompleta) : null) ??
    (address ? direccionCortaDesdeAddress(address) : null);

  const barrio = address ? barrioDesdeAddress(address) : null;

  return { direccion, barrio };
}
