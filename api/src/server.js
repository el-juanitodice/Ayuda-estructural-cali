/**
 * API — Fastify (BRIEF §5). Puntos 1–5 del orden de construcción.
 * También sirve el front compilado (web/dist) para ahorrar un servicio
 * en Railway (ARQUITECTURA §1).
 */

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import staticPlugin from '@fastify/static';
import { config, validarConfig } from './config.js';
import { sql, verificarPostgis } from './db.js';
import { configurarSesiones } from './auth/sesiones.js';
import { iniciarMantenimiento } from './mantenimiento.js';
import rutasAuth from './rutas/auth.js';
import rutasReportes from './rutas/reportes.js';
import rutasFotos from './rutas/fotos.js';
import rutasModeracion from './rutas/moderacion.js';
import rutasAdmin from './rutas/admin.js';

const faltan = validarConfig();
if (faltan.length) {
  console.error('Faltan variables de entorno:', faltan.join(', '));
  process.exit(1);
}

const app = Fastify({
  logger: { level: config.produccion ? 'info' : 'debug' },
  trustProxy: true, // Railway pone un proxy delante; sin esto el rate limit por IP no sirve
});

await app.register(cookie, { secret: config.sesion.secreto });
await app.register(rateLimit, { global: false });
configurarSesiones(app);

// Errores con la forma acordada en API.md
app.setErrorHandler((err, req, reply) => {
  if (err.validation) {
    return reply.code(422).send({
      error: 'validacion',
      mensaje: 'Datos inválidos.',
      detalles: err.validation,
    });
  }
  if (err.statusCode === 429) {
    return reply.code(429).send({
      error: 'demasiadas_solicitudes',
      mensaje: 'Demasiadas solicitudes. Espera un momento e intenta de nuevo.',
    });
  }
  req.log.error(err);
  reply.code(err.statusCode || 500).send({
    error: 'interno',
    mensaje: 'Error interno. Intenta de nuevo.',
  });
});

// Health check de Railway: DB viva Y PostGIS presente (ARQUITECTURA §5)
const salud = async (req, reply) => {
  try {
    const postgis = await verificarPostgis();
    return { ok: true, postgis };
  } catch (err) {
    req.log.error(err, 'health check falló');
    return reply.code(503).send({ ok: false });
  }
};
app.get('/salud', salud);
app.get('/api/v1/salud', salud); // la ruta que usa el healthcheck de railway.json

for (const rutas of [rutasAuth, rutasReportes, rutasFotos, rutasModeracion, rutasAdmin]) {
  await app.register(rutas, { prefix: '/api/v1' });
}

// ── Front estático (web/dist) con fallback SPA ─────────────────────
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const distWeb = join(raiz, 'web', 'dist');
if (existsSync(distWeb)) {
  await app.register(staticPlugin, { root: distWeb, wildcard: true });
  app.setNotFoundHandler((req, reply) => {
    if (req.raw.url?.startsWith('/api/')) {
      return reply.code(404).send({ error: 'no_existe', mensaje: 'Ruta no encontrada.' });
    }
    return reply.sendFile('index.html'); // SPA: el router del front resuelve
  });
} else {
  app.log.warn('web/dist no existe: corre `npm run build` para servir el front');
}

iniciarMantenimiento(app.log);

const cerrar = async () => {
  await app.close();
  await sql.end({ timeout: 5 });
  process.exit(0);
};
process.on('SIGTERM', cerrar);
process.on('SIGINT', cerrar);

await app.listen({ port: config.puerto, host: '0.0.0.0' });
