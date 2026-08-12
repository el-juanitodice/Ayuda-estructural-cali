/**
 * Rutas públicas (API.md §Público): reporte ciudadano, mapa, consulta de estado.
 *
 * BRIEF §2.3: el servidor evalúa requiereLlamar123() por su cuenta. Si da
 * verdadero responde 409 emergencia_123 PERO guarda el reporte igual y lo
 * deja marcado — la vida primero, el dato también.
 */

import { requiereLlamar123, USOS } from '../../../shared/ais.js';
import { sql } from '../db.js';
import { config } from '../config.js';

// Cali y alrededores; un punto en Bogotá es un error de GPS o spam
const LAT = { min: 2.9, max: 4.0 }, LNG = { min: -77.2, max: -76.0 };

export default async function rutasReportes(app) {
  // ── Reporte ciudadano (sin cuenta) ─────────────────────────────────
  app.post('/reportes', {
    config: {
      rateLimit: { max: config.operacion.rateReportesHoraIp, timeWindow: '1 hour' },
    },
    schema: {
      body: {
        type: 'object',
        required: ['reportante_nombre', 'reportante_telefono', 'direccion', 'lat', 'lng'],
        additionalProperties: false,
        properties: {
          reportante_nombre: { type: 'string', minLength: 3, maxLength: 120 },
          reportante_telefono: { type: 'string', minLength: 7, maxLength: 20, pattern: '^[0-9+\\-\\s]+$' },
          reportante_relacion: { type: ['string', 'null'], maxLength: 40 },
          direccion: { type: 'string', minLength: 5, maxLength: 200 },
          barrio: { type: ['string', 'null'], maxLength: 80 },
          lat: { type: 'number', minimum: LAT.min, maximum: LAT.max },
          lng: { type: 'number', minimum: LNG.min, maximum: LNG.max },
          precision_gps_m: { type: ['integer', 'null'], minimum: 0, maximum: 10000 },
          tipo_edificacion: { type: ['string', 'null'], maxLength: 40 },
          pisos_declarados: { type: ['integer', 'null'], minimum: 1, maximum: 120 },
          unidades_declaradas: { type: ['integer', 'null'], minimum: 1, maximum: 5000 },
          habitada: { type: ['boolean', 'null'] },
          uso_declarado: { type: ['integer', 'null'], enum: [...Object.keys(USOS).map(Number), null] },
          descripcion: { type: ['string', 'null'], maxLength: 4000 },
          banderas: {
            type: 'object', additionalProperties: false,
            properties: {
              personasAtrapadas: { type: 'boolean' },
              colapsoEnCurso: { type: 'boolean' },
            },
          },
        },
      },
    },
  }, async (req, reply) => {
    const b = req.body;
    const banderas = b.banderas || {};

    // El SERVIDOR decide si es emergencia; nunca confía en el cliente
    const emergencia = requiereLlamar123(b.descripcion || '', banderas);

    const [reporte] = await sql`
      INSERT INTO reportes (
        consecutivo, reportante_nombre, reportante_telefono, reportante_relacion,
        direccion, barrio, geom, precision_gps_m,
        tipo_edificacion, pisos_declarados, unidades_declaradas, habitada,
        uso_declarado, descripcion, menciona_colapso)
      VALUES (
        siguiente_consecutivo(), ${b.reportante_nombre}, ${b.reportante_telefono},
        ${b.reportante_relacion ?? null}, ${b.direccion}, ${b.barrio ?? null},
        ST_SetSRID(ST_MakePoint(${b.lng}, ${b.lat}), 4326)::geography,
        ${b.precision_gps_m ?? null}, ${b.tipo_edificacion ?? null},
        ${b.pisos_declarados ?? null}, ${b.unidades_declaradas ?? null},
        ${b.habitada ?? null}, ${b.uso_declarado ?? null}, ${b.descripcion ?? null},
        ${!!banderas.colapsoEnCurso})
      RETURNING id, uuid, consecutivo`;

    await sql`
      INSERT INTO reportes_historial (reporte_id, estado_ant, estado_nuevo, nota)
      VALUES (${reporte.id}, NULL, 'nuevo',
              ${emergencia ? 'EMERGENCIA_123: el reporte describe riesgo inmediato' : 'Reporte ciudadano recibido'})`;

    if (emergencia) {
      // 409: el cliente DEBE mostrar la pantalla "Llama al 123".
      // El reporte quedó guardado y marcado; el moderador lo verá de primero.
      return reply.code(409).send({
        error: 'emergencia_123',
        mensaje: 'Esto describe una emergencia. LLAMA AL 123 AHORA. Tu reporte quedó guardado.',
        uuid: reporte.uuid,
        consecutivo: reporte.consecutivo,
      });
    }

    return reply.code(201).send({ uuid: reporte.uuid, consecutivo: reporte.consecutivo });
  });

  // ── Mapa público (BRIEF §2.2) ──────────────────────────────────────
  app.get('/mapa', async () => {
    const puntos = await sql`
      SELECT uuid, consecutivo, barrio, comuna,
             ST_Y(geom_aprox::geometry) AS lat,
             ST_X(geom_aprox::geometry) AS lng,
             color, con_dictamen, dictaminado_en
      FROM mapa_publico`;
    return {
      // La leyenda viaja en la respuesta A PROPÓSITO: el cliente no debe
      // poder pintar el mapa sin ella.
      leyenda: {
        gris: 'Reportado por un ciudadano, sin inspección técnica. No indica daño.',
        colores: 'Inspección cerrada y firmada por un ingeniero.',
        advertencia: 'Que no haya punto no significa que una edificación esté en buen estado.',
      },
      puntos,
    };
  });

  // ── Consulta del ciudadano por radicado ────────────────────────────
  app.get('/reportes/:consecutivo/estado', {
    config: { rateLimit: { max: 60, timeWindow: '1 hour' } },
    schema: {
      params: {
        type: 'object', required: ['consecutivo'],
        properties: { consecutivo: { type: 'string', pattern: '^CAL-\\d{4}-\\d{5}$' } },
      },
    },
  }, async (req, reply) => {
    // Solo estado y fechas. Sin teléfono, sin detalle del dictamen (API.md).
    const [r] = await sql`
      SELECT r.consecutivo, r.estado, r.barrio, r.creado_en, r.validado_en,
             f.firmado_en,
             CASE WHEN r.estado = 'cerrado' THEN f.habitabilidad_final::text END AS color
      FROM reportes r
      LEFT JOIN formularios_ais f ON f.reporte_id = r.id AND f.estado = 'firmado'
      WHERE r.consecutivo = ${req.params.consecutivo}`;
    if (!r) {
      return reply.code(404).send({ error: 'no_existe', mensaje: 'Radicado no encontrado.' });
    }
    if (r.estado === 'descartado') r.estado = 'revisado_sin_inspeccion';
    return r;
  });
}
