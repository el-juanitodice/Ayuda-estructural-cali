/**
 * Admin (API.md §Admin, BRIEF §2.5).
 * Crea cuentas SIN contraseña: el sistema envía enlace de alta de un solo
 * uso (24 h). El admin nunca define ni ve claves.
 */

import { sql } from '../db.js';
import { auditar } from '../auditoria.js';
import { exigirRol } from '../auth/sesiones.js';
import { emitirEnlaceClave } from './auth.js';

export default async function rutasAdmin(app) {
  const soloAdmin = exigirRol('admin');

  app.post('/admin/usuarios', {
    preHandler: soloAdmin,
    schema: {
      body: {
        type: 'object', required: ['email', 'nombre', 'rol'], additionalProperties: false,
        properties: {
          email: { type: 'string', format: 'email', maxLength: 200 },
          nombre: { type: 'string', minLength: 3, maxLength: 120 },
          rol: { type: 'string', enum: ['admin', 'coordinador', 'moderador', 'ingeniero_a', 'ingeniero_b'] },
          telefono: { type: ['string', 'null'], maxLength: 20 },
          // Solo para ingenieros: el CHECK de la base exige matrícula verificada
          matricula: { type: ['string', 'null'], maxLength: 40 },
          profesion: { type: ['string', 'null'], maxLength: 80 },
          matricula_evidencia_url: { type: ['string', 'null'], maxLength: 500 },
        },
      },
    },
  }, async (req, reply) => {
    const b = req.body;
    const esIngeniero = ['ingeniero_a', 'ingeniero_b'].includes(b.rol);

    if (esIngeniero && !(b.matricula && b.profesion)) {
      return reply.code(422).send({
        error: 'matricula_requerida',
        mensaje: 'Un ingeniero requiere matrícula COPNIA verificada y profesión. Verifícala en copnia.gov.co antes de crear la cuenta.',
      });
    }

    const [existente] = await sql`SELECT 1 FROM usuarios WHERE email = ${b.email}`;
    if (existente) {
      return reply.code(409).send({ error: 'email_en_uso', mensaje: 'Ya existe una cuenta con ese correo.' });
    }

    const [u] = await sql`
      INSERT INTO usuarios (email, nombre, rol, telefono, creado_por,
                            matricula, profesion, matricula_evidencia_url,
                            matricula_verificada_por, matricula_verificada_en)
      VALUES (${b.email}, ${b.nombre}, ${b.rol}, ${b.telefono ?? null}, ${req.usuario.id},
              ${esIngeniero ? b.matricula : null}, ${esIngeniero ? b.profesion : null},
              ${esIngeniero ? (b.matricula_evidencia_url ?? null) : null},
              ${esIngeniero ? req.usuario.id : null}, ${esIngeniero ? sql`now()` : null})
      RETURNING id, email, nombre, rol`;

    await emitirEnlaceClave({ usuario: u, proposito: 'alta_clave', log: req.log });
    await auditar({
      usuarioId: req.usuario.id, accion: 'crear_usuario', entidad: 'usuarios',
      entidadId: u.id, detalle: { rol: u.rol }, ip: req.ip,
    });

    return reply.code(201).send({ usuario: u, mensaje: 'Cuenta creada. Se envió el enlace de alta al correo.' });
  });

  app.post('/admin/usuarios/:id/desactivar', {
    preHandler: soloAdmin,
    schema: { params: { type: 'object', properties: { id: { type: 'integer' } } } },
  }, async (req, reply) => {
    if (req.params.id === req.usuario.id) {
      return reply.code(422).send({ error: 'auto_desactivacion', mensaje: 'No puedes desactivarte a ti mismo.' });
    }
    await sql.begin(async (tx) => {
      await tx`UPDATE usuarios SET activo = false WHERE id = ${req.params.id}`;
      await tx`UPDATE sesiones SET revocada_en = now()
               WHERE usuario_id = ${req.params.id} AND revocada_en IS NULL`;
    });
    await auditar({
      usuarioId: req.usuario.id, accion: 'desactivar_usuario', entidad: 'usuarios',
      entidadId: req.params.id, ip: req.ip,
    });
    return { ok: true };
  });

  app.get('/admin/usuarios', { preHandler: soloAdmin }, async () => {
    const usuarios = await sql`
      SELECT id, email, nombre, rol, telefono, activo, matricula,
             clave_definida_en IS NOT NULL AS clave_definida, ultimo_acceso
      FROM usuarios ORDER BY creado_en DESC`;
    return { usuarios };
  });

  app.get('/admin/auditoria', {
    preHandler: soloAdmin,
    schema: {
      querystring: {
        type: 'object', additionalProperties: false,
        properties: {
          usuario_id: { type: 'integer' },
          accion: { type: 'string', maxLength: 40 },
          limite: { type: 'integer', minimum: 1, maximum: 500, default: 100 },
        },
      },
    },
  }, async (req) => {
    const { usuario_id, accion, limite } = req.query;
    const eventos = await sql`
      SELECT a.id, a.usuario_id, u.nombre, a.accion, a.entidad, a.entidad_id,
             a.detalle, a.ip, a.creado_en
      FROM auditoria a LEFT JOIN usuarios u ON u.id = a.usuario_id
      WHERE (${usuario_id ?? null}::bigint IS NULL OR a.usuario_id = ${usuario_id ?? null})
        AND (${accion ?? null}::text IS NULL OR a.accion = ${accion ?? null})
      ORDER BY a.creado_en DESC LIMIT ${limite ?? 100}`;
    return { eventos };
  });
}
