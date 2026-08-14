-- Roles + app modules + permission matrix (Festiva-style, adapted for Cali)
-- Idempotent: safe to re-run if tables/columns already exist.
USE cali_inspeccion;

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS roles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) NOT NULL DEFAULT ''
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS app_modules (
  id CHAR(36) NOT NULL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  route_path VARCHAR(200) NULL,
  nav_sort_order INT NOT NULL DEFAULT 0,
  is_system TINYINT(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS role_permissions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  role_id CHAR(36) NOT NULL,
  app_module_id CHAR(36) NOT NULL,
  r TINYINT(1) NOT NULL DEFAULT 0,
  w TINYINT(1) NOT NULL DEFAULT 0,
  u TINYINT(1) NOT NULL DEFAULT 0,
  d TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_role_permissions_module FOREIGN KEY (app_module_id) REFERENCES app_modules(id) ON DELETE CASCADE,
  CONSTRAINT uq_role_permissions_role_module UNIQUE (role_id, app_module_id)
) ENGINE=InnoDB;

-- role_id on usuarios (skip if already present)
SET @has_role_id := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'role_id'
);
SET @sql := IF(
  @has_role_id = 0,
  'ALTER TABLE usuarios ADD COLUMN role_id CHAR(36) NULL',
  'SELECT ''usuarios.role_id already exists'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_fk := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'usuarios'
    AND CONSTRAINT_NAME = 'fk_usuarios_role'
);
SET @sql := IF(
  @has_fk = 0,
  'ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL',
  'SELECT ''fk_usuarios_role already exists'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
