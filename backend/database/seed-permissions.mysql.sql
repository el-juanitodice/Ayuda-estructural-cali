-- Seed roles, app_modules, role_permissions and backfill usuarios.role_id
-- Run after 002_roles_modules.sql
USE cali_inspeccion;

SET NAMES utf8mb4;

-- Roles (fixed UUIDs for reproducibility)
INSERT INTO roles (id, name, description) VALUES
  ('a0000001-0000-4000-8000-000000000001', 'Administrador', 'Acceso total al sistema'),
  ('a0000001-0000-4000-8000-000000000002', 'Coordinador', 'Tablero de cobertura y seguimiento'),
  ('a0000001-0000-4000-8000-000000000003', 'Moderador', 'Validacion y asignacion de reportes'),
  ('a0000001-0000-4000-8000-000000000004', 'Ingeniero A', 'Revision estructural nivel A'),
  ('a0000001-0000-4000-8000-000000000005', 'Ingeniero B', 'Captura en campo nivel B')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- App modules
INSERT INTO app_modules (id, code, name, description, route_path, nav_sort_order, is_system) VALUES
  ('b0000001-0000-4000-8000-000000000001', 'campo', 'Campo', 'Captura de formularios en sitio', '/campo', 10, 1),
  ('b0000001-0000-4000-8000-000000000002', 'revision', 'Revision', 'Cola y firma de revision nivel A', '/revision', 20, 1),
  ('b0000001-0000-4000-8000-000000000003', 'aviso', 'Aviso', 'Consulta de avisos estructurales', NULL, 30, 1),
  ('b0000001-0000-4000-8000-000000000004', 'moderacion', 'Moderacion', 'Validacion y asignacion de reportes', '/moderacion', 40, 1),
  ('b0000001-0000-4000-8000-000000000005', 'tablero', 'Tablero', 'Cobertura, discrepancias y exportacion', '/tablero', 50, 1),
  ('b0000001-0000-4000-8000-000000000006', 'admin_usuarios', 'Admin usuarios', 'Gestion de cuentas de usuario', '/admin', 60, 1),
  ('b0000001-0000-4000-8000-000000000007', 'admin_roles', 'Admin roles', 'Gestion de roles y permisos', NULL, 70, 1),
  ('b0000001-0000-4000-8000-000000000008', 'admin_modules', 'Admin modulos', 'Catalogo de modulos de la app', NULL, 80, 1),
  ('b0000001-0000-4000-8000-000000000009', 'fotos', 'Fotos', 'Acceso a fotos de reportes', NULL, 90, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  route_path = VALUES(route_path),
  nav_sort_order = VALUES(nav_sort_order),
  is_system = VALUES(is_system);

-- Helper: clear existing matrix rows for idempotent re-run
DELETE FROM role_permissions;

-- Administrador: all true on all modules
INSERT INTO role_permissions (id, role_id, app_module_id, r, w, u, d)
SELECT UUID(), 'a0000001-0000-4000-8000-000000000001', m.id, 1, 1, 1, 1
FROM app_modules m;

-- Coordinador: tablero r/w/u, aviso r, fotos r
INSERT INTO role_permissions (id, role_id, app_module_id, r, w, u, d)
SELECT UUID(), 'a0000001-0000-4000-8000-000000000002', m.id,
  CASE m.code WHEN 'tablero' THEN 1 WHEN 'aviso' THEN 1 WHEN 'fotos' THEN 1 ELSE 0 END,
  CASE m.code WHEN 'tablero' THEN 1 ELSE 0 END,
  CASE m.code WHEN 'tablero' THEN 1 ELSE 0 END,
  0
FROM app_modules m;

-- Moderador: moderacion r/w/u/d, fotos r
INSERT INTO role_permissions (id, role_id, app_module_id, r, w, u, d)
SELECT UUID(), 'a0000001-0000-4000-8000-000000000003', m.id,
  CASE m.code WHEN 'moderacion' THEN 1 WHEN 'fotos' THEN 1 ELSE 0 END,
  CASE m.code WHEN 'moderacion' THEN 1 ELSE 0 END,
  CASE m.code WHEN 'moderacion' THEN 1 ELSE 0 END,
  CASE m.code WHEN 'moderacion' THEN 1 ELSE 0 END
FROM app_modules m;

-- Ingeniero A: revision r/w/u, aviso r, fotos r/w
INSERT INTO role_permissions (id, role_id, app_module_id, r, w, u, d)
SELECT UUID(), 'a0000001-0000-4000-8000-000000000004', m.id,
  CASE m.code WHEN 'revision' THEN 1 WHEN 'aviso' THEN 1 WHEN 'fotos' THEN 1 ELSE 0 END,
  CASE m.code WHEN 'revision' THEN 1 WHEN 'fotos' THEN 1 ELSE 0 END,
  CASE m.code WHEN 'revision' THEN 1 ELSE 0 END,
  0
FROM app_modules m;

-- Ingeniero B: campo r/w/u, aviso r, fotos r/w
INSERT INTO role_permissions (id, role_id, app_module_id, r, w, u, d)
SELECT UUID(), 'a0000001-0000-4000-8000-000000000005', m.id,
  CASE m.code WHEN 'campo' THEN 1 WHEN 'aviso' THEN 1 WHEN 'fotos' THEN 1 ELSE 0 END,
  CASE m.code WHEN 'campo' THEN 1 WHEN 'fotos' THEN 1 ELSE 0 END,
  CASE m.code WHEN 'campo' THEN 1 ELSE 0 END,
  0
FROM app_modules m;

-- Backfill usuarios.role_id from legacy rol enum (solo si la columna existe)
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
  'SELECT ''skip backfill: usuarios.rol not present'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Usuarios sin role_id: asignar Administrador por defecto (dev/seed)
UPDATE usuarios u
JOIN roles r ON r.name = 'Administrador'
SET u.role_id = r.id
WHERE u.role_id IS NULL;
