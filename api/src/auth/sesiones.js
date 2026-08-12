/**
 * Sesiones opacas en cookie httpOnly (ARQUITECTURA §6).
 * Nada de JWT en localStorage: el id es 32 bytes aleatorios y el estado
 * vive en la tabla `sesiones`, revocable al instante.
 */

import { randomBytes, createHash } from 'node:crypto';
import { sql } from '../db.js';
import { config } from '../config.js';

export const COOKIE_SESION = 'sesion';

export const sha256 = (s) => createHash('sha256').update(s).digest('hex');

export async function crearSesion(usuarioId, req, reply) {
  const id = randomBytes(32).toString('hex');
  await sql`
    INSERT INTO sesiones (id, usuario_id, ip, user_agent, expira_en)
    VALUES (${id}, ${usuarioId}, ${req.ip}, ${req.headers['user-agent'] || null},
            now() + ${config.sesion.ttlHoras + ' hours'}::interval)`;
  reply.setCookie(COOKIE_SESION, id, {
    path: '/',
    httpOnly: true,
    secure: config.produccion,
    sameSite: 'lax',
    domain: config.sesion.cookieDominio,
    maxAge: config.sesion.ttlHoras * 3600,
  });
}

export async function revocarSesion(id, reply) {
  await sql`UPDATE sesiones SET revocada_en = now() WHERE id = ${id}`;
  reply.clearCookie(COOKIE_SESION, { path: '/' });
}

/**
 * Se llama UNA vez en server.js (no con register: los decoradores deben
 * quedar en el ámbito raíz). Resuelve req.usuario (o null) desde la cookie.
 * No exige nada por sí solo; para eso está exigirRol().
 */
export function configurarSesiones(app) {
  app.decorateRequest('usuario', null);
  app.decorateRequest('sesionId', null);

  app.addHook('preHandler', async (req) => {
    const id = req.cookies?.[COOKIE_SESION];
    if (!id || id.length !== 64) return;
    const [fila] = await sql`
      SELECT s.id AS sesion_id, u.id, u.uuid, u.email, u.nombre, u.rol,
             u.matricula, u.activo, u.hash_clave
      FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id
      WHERE s.id = ${id} AND s.revocada_en IS NULL AND s.expira_en > now()
        AND u.activo`;
    if (fila) {
      req.sesionId = fila.sesion_id;
      req.usuario = fila;
    }
  });
}

/** preHandler de ruta: exige sesión y uno de los roles dados. */
export function exigirRol(...roles) {
  return async (req, reply) => {
    if (!req.usuario) {
      return reply.code(401).send({ error: 'sin_sesion', mensaje: 'Inicia sesión.' });
    }
    if (roles.length && !roles.includes(req.usuario.rol)) {
      return reply.code(403).send({ error: 'rol_insuficiente', mensaje: 'No tienes permiso para esto.' });
    }
  };
}
