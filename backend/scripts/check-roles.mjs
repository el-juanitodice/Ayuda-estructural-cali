import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'root',
  database: 'cali_inspeccion',
});

const [db] = await conn.query('SELECT DATABASE() AS db');
console.log('DATABASE():', db[0].db);

const [tables] = await conn.query("SHOW TABLES LIKE 'roles'");
console.log('roles table exists:', tables.length > 0);

if (tables.length === 0) {
  console.log('ERROR: tabla roles no existe. Ejecuta 002_roles_modules.sql primero.');
  await conn.end();
  process.exit(1);
}

const [desc] = await conn.query('DESCRIBE roles');
console.log('DESCRIBE roles:', desc.map((c) => `${c.Field}:${c.Type}`).join(', '));

const [before] = await conn.query('SELECT COUNT(*) AS c FROM roles');
console.log('roles count BEFORE:', before[0].c);

try {
  const [res] = await conn.query(
    `INSERT INTO roles (id, name, description) VALUES
     ('a0000001-0000-4000-8000-000000000001', 'Administrador', 'Acceso total al sistema')
     ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)`,
  );
  console.log('INSERT OK:', { affectedRows: res.affectedRows, insertId: res.insertId });
} catch (e) {
  console.error('INSERT FAILED:', e.message);
}

const [after] = await conn.query('SELECT COUNT(*) AS c FROM roles');
console.log('roles count AFTER:', after[0].c);

const [rows] = await conn.query('SELECT id, name FROM roles');
console.log('roles rows:', rows);

await conn.end();
