/**
 * Rutas de fotos: prefirmar y confirmar (API.md §Fotos, ARQUITECTURA §3).
 *
 * Flujo: el navegador comprime → pide URLs prefirmadas → sube DIRECTO al
 * bucket → confirma. El API nunca toca los bytes de la imagen.
 *
 * Idempotencia por `uuid` del cliente: un reintento de la cola offline no
 * duplica nada en ninguna de las dos rutas.
 *
 * Origen: si hay sesión de ingeniero, la foto queda como suya; si no, es
 * del ciudadano (que reporta sin cuenta).
 */

import { CATEGORIAS_FOTO, MAX_FOTOS_POR_REPORTE } from '../../../shared/ais.js';
import { sql } from '../db.js';
import { prefirmarPut, existeObjeto } from '../s3.js';

const CATEGORIAS_VALIDAS = [
  ...CATEGORIAS_FOTO.obligatorias,
  ...CATEGORIAS_FOTO.libres,
];

// Post-compresión real: full ~180 KB, thumb ~25 KB. 4 MB ya es señal de abuso.
const MAX_BYTES_FULL = 4 * 1024 * 1024;
const MAX_BYTES_THUMB = 512 * 1024;

export default async function rutasFotos(app) {
  app.post('/fotos/prefirmar', {
    config: {
      // 200 fotos/hora por IP (ARQUITECTURA §3)
      rateLimit: { max: 200, timeWindow: '1 hour' },
    },
    schema: {
      body: {
        type: 'object',
        required: ['reporte_uuid', 'uuid', 'categoria', 'formato', 'bytes_full', 'bytes_thumb'],
        additionalProperties: false,
        properties: {
          reporte_uuid: { type: 'string', format: 'uuid' },
          uuid: { type: 'string', format: 'uuid' },
          categoria: { type: 'string', enum: CATEGORIAS_VALIDAS },
          piso: { type: ['string', 'null'], maxLength: 10 },
          formato: { type: 'string', enum: ['webp', 'jpeg'] },
          bytes_full: { type: 'integer', minimum: 1, maximum: MAX_BYTES_FULL },
          bytes_thumb: { type: 'integer', minimum: 1, maximum: MAX_BYTES_THUMB },
        },
      },
    },
  }, async (req, reply) => {
    const { reporte_uuid, uuid, categoria, piso, formato, bytes_full, bytes_thumb } = req.body;

    const [reporte] = await sql`
      SELECT id FROM reportes WHERE uuid = ${reporte_uuid}`;
    if (!reporte) {
      return reply.code(404).send({
        error: 'reporte_no_existe',
        mensaje: 'El reporte aún no llega al servidor. La app reintentará sola.',
      });
    }

    // Reintento de una foto ya registrada: no firmar nada de nuevo
    const [ya] = await sql`SELECT 1 FROM fotos WHERE uuid = ${uuid}`;
    if (ya) return { ya_confirmada: true };

    // Cupo: confirmadas + pendientes de otros uuids (el trigger de la base
    // es la última línea de defensa; esta es la amable)
    const [{ total }] = await sql`
      SELECT (SELECT count(*) FROM fotos WHERE reporte_id = ${reporte.id})
           + (SELECT count(*) FROM fotos_pendientes
              WHERE reporte_id = ${reporte.id} AND uuid <> ${uuid}) AS total`;
    if (Number(total) >= MAX_FOTOS_POR_REPORTE) {
      return reply.code(409).send({
        error: 'cupo_lleno',
        mensaje: `Este reporte ya tiene ${MAX_FOTOS_POR_REPORTE} fotos.`,
      });
    }

    const ext = formato === 'webp' ? 'webp' : 'jpg';
    const keyFull = `reportes/${reporte_uuid}/${uuid}-full.${ext}`;
    const keyThumb = `reportes/${reporte_uuid}/${uuid}-thumb.${ext}`;
    const contentType = formato === 'webp' ? 'image/webp' : 'image/jpeg';

    const esIngeniero = ['ingeniero_a', 'ingeniero_b'].includes(req.usuario?.rol);
    const origen = esIngeniero ? req.usuario.rol : 'ciudadano';
    const subidaPor = esIngeniero ? req.usuario.id : null;

    // Registra (o refresca) la intención. Upsert = reintento idempotente.
    await sql`
      INSERT INTO fotos_pendientes
        (uuid, reporte_id, origen, subida_por, categoria, piso, key_full, key_thumb, bytes_full, bytes_thumb)
      VALUES
        (${uuid}, ${reporte.id}, ${origen}, ${subidaPor}, ${categoria}, ${piso ?? null},
         ${keyFull}, ${keyThumb}, ${bytes_full}, ${bytes_thumb})
      ON CONFLICT (uuid) DO UPDATE
        SET categoria = EXCLUDED.categoria, piso = EXCLUDED.piso`;

    const [put_full, put_thumb] = await Promise.all([
      prefirmarPut(keyFull, contentType),
      prefirmarPut(keyThumb, contentType),
    ]);

    return { put_full, put_thumb, key_full: keyFull, key_thumb: keyThumb };
  });

  app.post('/fotos/confirmar', {
    schema: {
      body: {
        type: 'object',
        required: ['uuid'],
        additionalProperties: false,
        properties: {
          uuid: { type: 'string', format: 'uuid' },
          ancho: { type: 'integer', minimum: 1, maximum: 10000 },
          alto: { type: 'integer', minimum: 1, maximum: 10000 },
          exif: {
            type: ['object', 'null'],
            additionalProperties: false,
            properties: {
              lat: { type: ['number', 'null'], minimum: -90, maximum: 90 },
              lng: { type: ['number', 'null'], minimum: -180, maximum: 180 },
              tomada_en: { type: ['string', 'null'] },
            },
          },
        },
      },
    },
  }, async (req, reply) => {
    const { uuid, ancho, alto, exif } = req.body;

    // Idempotente: si ya está en `fotos`, el reintento fue exitoso antes
    const [ya] = await sql`SELECT 1 FROM fotos WHERE uuid = ${uuid}`;
    if (ya) return { ok: true, ya_confirmada: true };

    const [pend] = await sql`SELECT * FROM fotos_pendientes WHERE uuid = ${uuid}`;
    if (!pend) {
      return reply.code(404).send({
        error: 'prefirma_no_existe',
        mensaje: 'Primero pide /fotos/prefirmar para esta foto.',
      });
    }

    // No registrar fotos fantasma: verifica que los objetos SÍ están en el bucket
    const [hayFull, hayThumb] = await Promise.all([
      existeObjeto(pend.key_full),
      existeObjeto(pend.key_thumb),
    ]);
    if (!hayFull || !hayThumb) {
      return reply.code(409).send({
        error: 'subida_incompleta',
        mensaje: 'Los archivos aún no llegan al bucket. Reintenta la subida.',
      });
    }

    const lat = exif?.lat ?? null;
    const lng = exif?.lng ?? null;
    const tomadaEn = exif?.tomada_en ?? null;

    await sql.begin(async (tx) => {
      // ON CONFLICT: dos confirmaciones simultáneas del mismo uuid no duplican.
      // El trigger fn_limite_fotos de la base sigue vigente como tope duro.
      await tx`
        INSERT INTO fotos
          (uuid, reporte_id, origen, subida_por, categoria, piso,
           key_full, key_thumb, bytes_full, ancho, alto, exif_geom, tomada_en)
        VALUES
          (${uuid}, ${pend.reporte_id}, ${pend.origen}, ${pend.subida_por},
           ${pend.categoria}, ${pend.piso},
           ${pend.key_full}, ${pend.key_thumb}, ${pend.bytes_full},
           ${ancho ?? null}, ${alto ?? null},
           ${lat !== null && lng !== null
             ? tx`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`
             : null},
           ${tomadaEn})
        ON CONFLICT (uuid) DO NOTHING`;
      await tx`DELETE FROM fotos_pendientes WHERE uuid = ${uuid}`;
    });

    return { ok: true };
  });
}
