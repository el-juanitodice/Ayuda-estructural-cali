/**
 * Ejecuta backend/database/seed.mysql.sql contra MySQL usando credenciales de .env
 * Uso: npm run db:seed --workspace backend
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import mysql from 'mysql2/promise';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../.env') });

const {
  DB_HOST = 'localhost',
  DB_PORT = '3306',
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_NAME = 'cali_inspeccion',
} = process.env;

const sqlPath = join(__dirname, '../database/seed.mysql.sql');
const sql = readFileSync(sqlPath, 'utf8');

const conn = await mysql.createConnection({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  multipleStatements: true,
});

try {
  await conn.query(sql);
  const [rows] = await conn.query(
    'SELECT (SELECT COUNT(*) FROM usuarios) AS usuarios, (SELECT COUNT(*) FROM reportes) AS reportes',
  );
  const res = rows[0];
  console.log(`Semilla OK: ${res.usuarios} usuarios, ${res.reportes} reportes`);
  console.log('Login dev: admin@ejemplo.co / Admin123456789');
} finally {
  await conn.end();
}
