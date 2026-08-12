/**
 * Inicialización de la base al arrancar.
 *
 * Si la base está vacía (no existe `usuarios`) aplica db/schema.sql.
 * Las migraciones son idempotentes (IF NOT EXISTS / OR REPLACE) y se
 * aplican siempre. Si no hay ningún usuario, crea el admin inicial SIN
 * contraseña: la define por el enlace de recuperación (BRIEF §2.5).
 *
 * schema.sql NO se modifica (BRIEF §6): solo se ejecuta tal cual.
 */

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql } from './db.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const MIGRACIONES = [
  'db/migraciones/001_fotos_pendientes.sql',
  'db/migraciones/002_consecutivo.sql',
];

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'juandavidom@icloud.com';
const ADMIN_NOMBRE = process.env.ADMIN_NOMBRE || 'Juan David Montoya';

async function esperarBase(log, intentos = 10) {
  for (let i = 1; i <= intentos; i++) {
    try {
      await sql`SELECT 1`;
      return;
    } catch (err) {
      if (i === intentos) throw err;
      log.warn(`Base no responde aún (intento ${i}/${intentos}); espero 3 s…`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

export async function aplicarEsquemaSiFalta(log) {
  await esperarBase(log);

  const [ya] = await sql`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'usuarios'`;

  if (!ya) {
    log.warn('Base vacía: aplicando db/schema.sql');
    await sql.file(join(RAIZ, 'db', 'schema.sql'));
    log.info('Esquema aplicado');
  }

  for (const m of MIGRACIONES) {
    await sql.file(join(RAIZ, m)); // idempotentes
  }

  const [{ n }] = await sql`SELECT count(*)::int AS n FROM usuarios`;
  if (n === 0) {
    await sql`
      INSERT INTO usuarios (email, nombre, rol)
      VALUES (${ADMIN_EMAIL}, ${ADMIN_NOMBRE}, 'admin')`;
    log.warn(`Admin inicial creado: ${ADMIN_EMAIL}. ` +
      'Define la contraseña con "Olvidé mi contraseña" en /#/ingreso.');
  }
}
