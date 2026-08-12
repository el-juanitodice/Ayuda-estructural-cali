/**
 * Autenticación (API.md §Autenticación, BRIEF §2.5 y §2.6).
 *
 *  - Nadie se auto-registra: las cuentas las crea el admin (rutas/admin.js).
 *  - La contraseña se define por enlace de un solo uso (24 h), token hasheado.
 *  - Login con Argon2id; bloqueo tras MAX_INTENTOS_LOGIN por BLOQUEO_MINUTOS.
 *  - Firmar exige contraseña de nuevo: /reautenticar entrega un ticket de
 *    firma de un solo uso válido 5 minutos.
 */

import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { sql } from '../db.js';
import { config } from '../config.js';
import { auditar } from '../auditoria.js';
import { crearSesion, revocarSesion, exigirRol, sha256 } from '../auth/sesiones.js';
import { enviarEnlaceClave } from '../correo.js';

const OPCIONES_ARGON = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 };

// Tickets de firma en memoria: TTL 5 min, un solo uso. Si el proceso se
// reinicia se pierden — el ingeniero re-autentica de nuevo, sin daño.
const ticketsFirma = new Map(); // ticket → { usuarioId, expira }

export function validarTicketFirma(ticket, usuarioId) {
  const t = ticketsFirma.get(ticket);
  ticketsFirma.delete(ticket); // un solo uso, incluso si falla
  return !!t && t.usuarioId === usuarioId && t.expira > Date.now();
}

/** Genera token de alta/recuperación y manda el correo. Lo usa también admin.js. */
export async function emitirEnlaceClave({ usuario, proposito, log }) {
  const token = randomBytes(32).toString('base64url');
  await sql`
    INSERT INTO tokens_acceso (usuario_id, token_hash, proposito, expira_en)
    VALUES (${usuario.id}, ${sha256(token)}, ${proposito}, now() + interval '24 hours')`;
  await enviarEnlaceClave({ email: usuario.email, nombre: usuario.nombre, token, proposito, log });
}

export default async function rutasAuth(app) {
  // ── Definir contraseña con enlace de un solo uso ───────────────────
  app.post('/auth/definir-clave', {
    config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
    schema: {
      body: {
        type: 'object', required: ['token', 'clave'], additionalProperties: false,
        properties: {
          token: { type: 'string', minLength: 20, maxLength: 100 },
          clave: { type: 'string', minLength: 12, maxLength: 200 },
        },
      },
    },
  }, async (req, reply) => {
    const { token, clave } = req.body;
    const hash = await argon2.hash(clave, OPCIONES_ARGON);

    const resultado = await sql.begin(async (tx) => {
      const [t] = await tx`
        SELECT t.id, t.usuario_id FROM tokens_acceso t
        JOIN usuarios u ON u.id = t.usuario_id AND u.activo
        WHERE t.token_hash = ${sha256(token)}
          AND t.usado_en IS NULL AND t.expira_en > now()
        FOR UPDATE`;
      if (!t) return null;
      await tx`UPDATE tokens_acceso SET usado_en = now() WHERE id = ${t.id}`;
      await tx`
        UPDATE usuarios SET hash_clave = ${hash}, clave_definida_en = now(),
               intentos_fallidos = 0, bloqueado_hasta = NULL
        WHERE id = ${t.usuario_id}`;
      // Cambiar la clave revoca cualquier sesión previa
      await tx`UPDATE sesiones SET revocada_en = now()
               WHERE usuario_id = ${t.usuario_id} AND revocada_en IS NULL`;
      return t.usuario_id;
    });

    if (!resultado) {
      return reply.code(422).send({
        error: 'token_invalido',
        mensaje: 'El enlace no es válido o ya expiró. Pide uno nuevo.',
      });
    }
    return { ok: true };
  });

  // ── Login ──────────────────────────────────────────────────────────
  app.post('/auth/login', {
    config: { rateLimit: { max: 30, timeWindow: '15 minutes' } },
    schema: {
      body: {
        type: 'object', required: ['email', 'clave'], additionalProperties: false,
        properties: {
          email: { type: 'string', format: 'email', maxLength: 200 },
          clave: { type: 'string', minLength: 1, maxLength: 200 },
        },
      },
    },
  }, async (req, reply) => {
    const { email, clave } = req.body;
    const generico = () => reply.code(401).send({
      error: 'credenciales',
      mensaje: 'Correo o contraseña incorrectos.',
    });

    const [u] = await sql`
      SELECT id, hash_clave, activo, intentos_fallidos, bloqueado_hasta
      FROM usuarios WHERE email = ${email}`;
    if (!u || !u.activo || !u.hash_clave) return generico();

    if (u.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date()) {
      return reply.code(429).send({
        error: 'bloqueado',
        mensaje: `Demasiados intentos. Espera ${config.sesion.bloqueoMinutos} minutos.`,
      });
    }

    const valida = await argon2.verify(u.hash_clave, clave).catch(() => false);
    if (!valida) {
      const intentos = u.intentos_fallidos + 1;
      const bloquear = intentos >= config.sesion.maxIntentosLogin;
      await sql`
        UPDATE usuarios SET intentos_fallidos = ${bloquear ? 0 : intentos},
          bloqueado_hasta = ${bloquear
            ? sql`now() + ${config.sesion.bloqueoMinutos + ' minutes'}::interval`
            : null}
        WHERE id = ${u.id}`;
      return generico();
    }

    await sql`
      UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL,
             ultimo_acceso = now() WHERE id = ${u.id}`;
    await crearSesion(u.id, req, reply);
    await auditar({ usuarioId: u.id, accion: 'login', entidad: 'usuarios', entidadId: u.id, ip: req.ip });

    const [yo] = await sql`
      SELECT uuid, email, nombre, rol, matricula FROM usuarios WHERE id = ${u.id}`;
    return { usuario: yo };
  });

  // ── Re-autenticación para firmar (BRIEF §2.6) ──────────────────────
  app.post('/auth/reautenticar', {
    preHandler: exigirRol('ingeniero_a'),
    config: { rateLimit: { max: 20, timeWindow: '15 minutes' } },
    schema: {
      body: {
        type: 'object', required: ['clave'], additionalProperties: false,
        properties: { clave: { type: 'string', minLength: 1, maxLength: 200 } },
      },
    },
  }, async (req, reply) => {
    const valida = await argon2.verify(req.usuario.hash_clave, req.body.clave).catch(() => false);
    if (!valida) {
      return reply.code(401).send({
        error: 'credenciales',
        mensaje: 'Contraseña incorrecta. La firma exige confirmar tu identidad.',
      });
    }
    const ticket = randomBytes(32).toString('base64url');
    ticketsFirma.set(ticket, {
      usuarioId: req.usuario.id,
      expira: Date.now() + config.sesion.ticketFirmaTtlMinutos * 60_000,
    });
    return { ticket_firma: ticket, valido_minutos: config.sesion.ticketFirmaTtlMinutos };
  });

  // ── Recuperación de contraseña ─────────────────────────────────────
  app.post('/auth/recuperar', {
    config: { rateLimit: { max: 5, timeWindow: '1 hour' } },
    schema: {
      body: {
        type: 'object', required: ['email'], additionalProperties: false,
        properties: { email: { type: 'string', format: 'email', maxLength: 200 } },
      },
    },
  }, async (req) => {
    const [u] = await sql`
      SELECT id, email, nombre FROM usuarios WHERE email = ${req.body.email} AND activo`;
    if (u) await emitirEnlaceClave({ usuario: u, proposito: 'recuperar_clave', log: req.log });
    // Siempre la misma respuesta: no revelar qué correos existen
    return { ok: true, mensaje: 'Si el correo existe, llegará un enlace.' };
  });

  // ── Sesión ─────────────────────────────────────────────────────────
  app.post('/auth/logout', async (req, reply) => {
    if (req.sesionId) await revocarSesion(req.sesionId, reply);
    return { ok: true };
  });

  app.get('/auth/yo', async (req, reply) => {
    if (!req.usuario) return reply.code(401).send({ error: 'sin_sesion', mensaje: 'Sin sesión.' });
    const { uuid, email, nombre, rol, matricula } = req.usuario;
    return { usuario: { uuid, email, nombre, rol, matricula } };
  });
}
