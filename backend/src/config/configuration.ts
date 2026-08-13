export default () => ({
  app: {
    port: parseInt(process.env.PORT ?? '3001', 10),
    entorno: process.env.NODE_ENV ?? 'development',
    urlBase: process.env.URL_BASE ?? 'http://localhost:3001',
    frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  },
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    username: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    name: process.env.DB_NAME ?? 'cali_inspeccion',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '12h',
  },
  auth: {
    maxIntentosLogin: parseInt(process.env.MAX_INTENTOS_LOGIN ?? '5', 10),
    bloqueoMinutos: parseInt(process.env.BLOQUEO_MINUTOS ?? '15', 10),
    ticketFirmaTtlMinutos: parseInt(process.env.TICKET_FIRMA_TTL_MINUTOS ?? '5', 10),
  },
  operacion: {
    maxFotosPorReporte: parseInt(process.env.MAX_FOTOS_POR_REPORTE ?? '100', 10),
    rateReportesHoraIp: parseInt(process.env.RATE_REPORTES_POR_HORA_IP ?? '3', 10),
    rateEstadoHoraIp: parseInt(process.env.RATE_ESTADO_POR_HORA_IP ?? '60', 10),
    rateFotosHoraIp: parseInt(process.env.RATE_FOTOS_POR_HORA_IP ?? '200', 10),
    /** Solo desarrollo: muestra reportes `nuevo` en gris (prod: solo tras validación) */
    mapaIncluirNuevo: process.env.MAPA_INCLUIR_NUEVO === 'true',
    asignacionTtlHoras: parseInt(process.env.ASIGNACION_TTL_HORAS ?? '48', 10),
  },
  storage: {
    /** Directorio raíz donde se guardan los archivos (relativo al cwd del backend o absoluto) */
    uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
    /** Tamaño máximo por archivo full/thumb en bytes */
    maxBytesFull: parseInt(process.env.MAX_BYTES_FOTO_FULL ?? String(4 * 1024 * 1024), 10),
    maxBytesThumb: parseInt(process.env.MAX_BYTES_FOTO_THUMB ?? String(512 * 1024), 10),
  },
});
