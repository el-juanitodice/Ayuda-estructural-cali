/** Configuración desde variables de entorno (ARQUITECTURA §4, .env.example). */

const num = (v, def) => (v === undefined || v === '' ? def : Number(v));

export const config = {
  puerto: num(process.env.PORT, 3000),
  produccion: process.env.NODE_ENV === 'production',
  urlBase: process.env.URL_BASE || 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL,

  sesion: {
    secreto: process.env.SESSION_SECRET,
    ttlHoras: num(process.env.SESSION_TTL_HORAS, 12),
    cookieDominio: process.env.COOKIE_DOMINIO || undefined,
    maxIntentosLogin: num(process.env.MAX_INTENTOS_LOGIN, 5),
    bloqueoMinutos: num(process.env.BLOQUEO_MINUTOS, 15),
    ticketFirmaTtlMinutos: num(process.env.TICKET_FIRMA_TTL_MINUTOS, 5),
  },

  s3: {
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'auto',
    bucket: process.env.S3_BUCKET,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    urlTtlSegundos: num(process.env.S3_URL_TTL_SEGUNDOS, 900),
  },

  correo: {
    resendApiKey: process.env.RESEND_API_KEY,
    remitente: process.env.CORREO_REMITENTE || 'no-responder@ejemplo.co',
  },

  operacion: {
    asignacionTtlHoras: num(process.env.ASIGNACION_TTL_HORAS, 48),
    maxFotosPorReporte: num(process.env.MAX_FOTOS_POR_REPORTE, 100),
    rateReportesHoraIp: num(process.env.RATE_REPORTES_POR_HORA_IP, 3),
    rateFotosHoraIp: num(process.env.RATE_FOTOS_POR_HORA_IP, 200),
    workerEnProceso: process.env.WORKER_EN_PROCESO !== 'false',
    workerIntervaloMinutos: num(process.env.WORKER_INTERVALO_MINUTOS, 5),
  },

  maxFotosPorReporte: num(process.env.MAX_FOTOS_POR_REPORTE, 100),
};

/** Falla rápido en el arranque, no a la primera petición. */
export function validarConfig() {
  const faltan = [];
  if (!config.databaseUrl) faltan.push('DATABASE_URL');
  if (!config.sesion.secreto) faltan.push('SESSION_SECRET');
  for (const [k, v] of Object.entries({
    S3_ENDPOINT: config.s3.endpoint, S3_BUCKET: config.s3.bucket,
    S3_ACCESS_KEY_ID: config.s3.accessKeyId, S3_SECRET_ACCESS_KEY: config.s3.secretAccessKey,
  })) if (!v) faltan.push(k);
  return faltan;
}
