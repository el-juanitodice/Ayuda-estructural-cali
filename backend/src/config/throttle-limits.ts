const UNA_HORA_MS = 3_600_000;

function entero(name: string, fallback: number): number {
  const n = parseInt(process.env[name] ?? String(fallback), 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** POST /reportes — por IP (legacy: RATE_REPORTES_POR_HORA_IP) */
export const THROTTLE_REPORTES_CREAR = {
  limit: entero('RATE_REPORTES_POR_HORA_IP', 3),
  ttl: UNA_HORA_MS,
} as const;

/** GET /reportes/:consecutivo/estado — por IP */
export const THROTTLE_REPORTES_ESTADO = {
  limit: entero('RATE_ESTADO_POR_HORA_IP', 60),
  ttl: UNA_HORA_MS,
} as const;

/** POST /fotos/subir — por IP */
export const THROTTLE_FOTOS_SUBIR = {
  limit: entero('RATE_FOTOS_POR_HORA_IP', 200),
  ttl: UNA_HORA_MS,
} as const;

/** POST /auth/recuperar — por IP */
export const THROTTLE_AUTH_RECUPERAR = {
  limit: entero('RATE_AUTH_RECUPERAR_POR_HORA_IP', 10),
  ttl: UNA_HORA_MS,
} as const;
