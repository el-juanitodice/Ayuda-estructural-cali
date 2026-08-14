-- Elimina columnas legacy y normaliza asignaciones a nivel A/B
-- Idempotent: detecta qué columnas existen antes de migrar.
-- Run after seed-permissions.mysql.sql (roles must exist).
USE cali_inspeccion;

SET NAMES utf8mb4;

-- 1) Backfill role_id from usuarios.rol (solo si la columna legacy aún existe)
SET @has_rol := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'rol'
);
SET @sql := IF(
  @has_rol > 0,
  'UPDATE usuarios u
   JOIN roles r ON (
     (u.rol = ''admin'' AND r.name = ''Administrador'') OR
     (u.rol = ''coordinador'' AND r.name = ''Coordinador'') OR
     (u.rol = ''moderador'' AND r.name = ''Moderador'') OR
     (u.rol = ''ingeniero_a'' AND r.name = ''Ingeniero A'') OR
     (u.rol = ''ingeniero_b'' AND r.name = ''Ingeniero B'')
   )
   SET u.role_id = r.id
   WHERE u.role_id IS NULL',
  'SELECT ''usuarios.rol already removed; skip backfill'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) Asignaciones: migrar rol_asignado -> nivel_ingenieria si aplica
SET @has_rol_asignado := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asignaciones' AND COLUMN_NAME = 'rol_asignado'
);
SET @has_nivel := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asignaciones' AND COLUMN_NAME = 'nivel_ingenieria'
);

SET @sql := IF(
  @has_nivel = 0,
  'ALTER TABLE asignaciones ADD COLUMN nivel_ingenieria ENUM(''A'', ''B'') NULL',
  'SELECT ''asignaciones.nivel_ingenieria already exists'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
  @has_rol_asignado > 0,
  'UPDATE asignaciones SET nivel_ingenieria = CASE
     WHEN rol_asignado = ''ingeniero_a'' THEN ''A''
     WHEN rol_asignado = ''ingeniero_b'' THEN ''B''
     ELSE ''B''
   END
   WHERE nivel_ingenieria IS NULL',
  'SELECT ''asignaciones.rol_asignado not found; skip data migration'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Filas sin nivel (tabla vacía o columna nueva): default B
UPDATE asignaciones SET nivel_ingenieria = 'B' WHERE nivel_ingenieria IS NULL;

SET @sql := IF(
  @has_rol_asignado > 0,
  'ALTER TABLE asignaciones DROP COLUMN rol_asignado',
  'SELECT ''asignaciones.rol_asignado already removed'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Asegurar NOT NULL (si ya era NOT NULL, no pasa nada)
ALTER TABLE asignaciones MODIFY COLUMN nivel_ingenieria ENUM('A', 'B') NOT NULL;

-- 3) Quitar usuarios.rol si aún existe
SET @sql := IF(
  @has_rol > 0,
  'ALTER TABLE usuarios DROP COLUMN rol',
  'SELECT ''usuarios.rol already removed'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
