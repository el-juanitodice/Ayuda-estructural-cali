-- Repara datos inconsistentes tras migraciones parciales + evita conflictos con TypeORM sync
USE cali_inspeccion;

SET NAMES utf8mb4;

-- 1) Normalizar asignaciones.nivel_ingenieria -> ENUM('A','B')
SET @has_nivel := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asignaciones' AND COLUMN_NAME = 'nivel_ingenieria'
);

SET @has_rol_asignado := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asignaciones' AND COLUMN_NAME = 'rol_asignado'
);

-- Si aún existe rol_asignado, copiar a nivel antes de dropear
SET @sql := IF(
  @has_rol_asignado > 0 AND @has_nivel = 0,
  'ALTER TABLE asignaciones ADD COLUMN nivel_ingenieria VARCHAR(20) NULL',
  'SELECT ''skip add nivel_ingenieria'' AS info'
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
   WHERE nivel_ingenieria IS NULL OR nivel_ingenieria NOT IN (''A'', ''B'')',
  'SELECT ''skip copy rol_asignado'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Pasar a VARCHAR temporalmente para limpiar valores viejos (ingeniero_a, etc.)
SET @sql := IF(
  @has_nivel > 0 OR @has_rol_asignado > 0,
  'ALTER TABLE asignaciones MODIFY COLUMN nivel_ingenieria VARCHAR(20) NULL',
  'SELECT ''asignaciones.nivel_ingenieria missing'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE asignaciones SET nivel_ingenieria = 'A' WHERE nivel_ingenieria IN ('ingeniero_a', 'A');
UPDATE asignaciones SET nivel_ingenieria = 'B'
WHERE nivel_ingenieria IN ('ingeniero_b', 'B')
   OR nivel_ingenieria IS NULL
   OR nivel_ingenieria NOT IN ('A', 'B');

ALTER TABLE asignaciones MODIFY COLUMN nivel_ingenieria ENUM('A', 'B') NOT NULL;

SET @sql := IF(
  @has_rol_asignado > 0,
  'ALTER TABLE asignaciones DROP COLUMN rol_asignado',
  'SELECT ''rol_asignado already removed'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) Asegurar FK usuarios.role_id con nombre estable (evita DROP INDEX en sync)
SET @has_fk := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'usuarios'
    AND CONSTRAINT_NAME = 'fk_usuarios_role'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @sql := IF(
  @has_fk = 0,
  'ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL',
  'SELECT ''fk_usuarios_role ok'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT DISTINCT nivel_ingenieria FROM asignaciones;
SELECT COUNT(*) AS usuarios_sin_rol FROM usuarios WHERE role_id IS NULL;
