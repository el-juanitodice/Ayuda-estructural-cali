import postgres from 'postgres';
import { config } from './config.js';

export const sql = postgres(config.databaseUrl, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
});

/** Para /salud: la app no sirve sin PostGIS (ARQUITECTURA §5). */
export async function verificarPostgis() {
  const [{ postgis_version }] = await sql`SELECT postgis_version()`;
  return postgis_version;
}
