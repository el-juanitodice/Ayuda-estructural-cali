/** Límites de coordenadas aceptadas por el backend (área metropolitana de Cali). */
export const LIMITES_GPS_CALI = {
  latMin: 2.9,
  latMax: 4.0,
  lngMin: -77.2,
  lngMax: -76.0,
} as const;

export function gpsEnAreaCali(lat: number, lng: number): boolean {
  return (
    lat >= LIMITES_GPS_CALI.latMin &&
    lat <= LIMITES_GPS_CALI.latMax &&
    lng >= LIMITES_GPS_CALI.lngMin &&
    lng <= LIMITES_GPS_CALI.lngMax
  );
}

/** Máximo aceptado por el backend (`CrearReporteDto.precision_gps_m`). */
export const MAX_PRECISION_GPS_M = 10_000;

export function normalizarPrecisionGps(precision: number): number | null {
  if (!Number.isFinite(precision) || precision < 0) return null;
  const redondeada = Math.round(precision);
  return Math.min(redondeada, MAX_PRECISION_GPS_M);
}

export function formatearPrecisionGps(precision: number): string {
  if (!Number.isFinite(precision) || precision < 0) return 'desconocida';
  const redondeada = Math.round(precision);
  if (redondeada > MAX_PRECISION_GPS_M) {
    return `±${MAX_PRECISION_GPS_M} m o más (señal GPS débil)`;
  }
  return `±${redondeada} m`;
}

function enteroPositivo(valor: unknown): number | null {
  const n = Number(valor);
  if (!Number.isFinite(n)) return null;
  const entero = Math.round(n);
  return entero >= 1 ? entero : null;
}

export interface PayloadReporte {
  reportante_nombre: string;
  reportante_telefono: string;
  reportante_relacion: string | null;
  direccion: string;
  barrio: string | null;
  lat: number;
  lng: number;
  precision_gps_m: number | null;
  tipo_edificacion: string | null;
  pisos_declarados: number | null;
  unidades_declaradas: number | null;
  habitada: boolean;
  uso_declarado: number | null;
  descripcion: string | null;
  banderas: {
    personasAtrapadas: boolean;
    colapsoEnCurso: boolean;
  };
}

export function construirPayloadReporte(
  datos: {
    reportante_nombre: string;
    reportante_telefono: string;
    reportante_relacion: string;
    direccion: string;
    barrio: string;
    tipo_edificacion: string;
    pisos_declarados: number;
    unidades_declaradas: number;
    habitada: boolean;
    uso_declarado: number;
    descripcion: string;
    personasAtrapadas: boolean;
    colapsoEnCurso: boolean;
  },
  gps: { lat: number; lng: number; precision: number },
): PayloadReporte {
  return {
    reportante_nombre: datos.reportante_nombre.trim(),
    reportante_telefono: datos.reportante_telefono.trim(),
    reportante_relacion: datos.reportante_relacion || null,
    direccion: datos.direccion.trim(),
    barrio: datos.barrio.trim() || null,
    lat: Number(gps.lat),
    lng: Number(gps.lng),
    precision_gps_m: normalizarPrecisionGps(gps.precision),
    tipo_edificacion: datos.tipo_edificacion || null,
    pisos_declarados: enteroPositivo(datos.pisos_declarados),
    unidades_declaradas: enteroPositivo(datos.unidades_declaradas),
    habitada: Boolean(datos.habitada),
    uso_declarado: enteroPositivo(datos.uso_declarado),
    descripcion: datos.descripcion.trim() || null,
    banderas: {
      personasAtrapadas: Boolean(datos.personasAtrapadas),
      colapsoEnCurso: Boolean(datos.colapsoEnCurso),
    },
  };
}
