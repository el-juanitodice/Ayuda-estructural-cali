-- Inserta roles base + modulos + matriz de permisos (idempotente, ASCII-only)
-- Error comun: ERROR 1366 = acentos con tabla/conn latin1. Este script convierte a utf8mb4.
USE cali_inspeccion;

SET NAMES utf8mb4;

ALTER TABLE roles CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE app_modules CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE role_permissions CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO roles (id, name, description) VALUES
  ('a0000001-0000-4000-8000-000000000001', 'Administrador', 'Acceso total al sistema'),
  ('a0000001-0000-4000-8000-000000000002', 'Coordinador', 'Tablero de cobertura y seguimiento'),
  ('a0000001-0000-4000-8000-000000000003', 'Moderador', 'Validacion y asignacion de reportes'),
  ('a0000001-0000-4000-8000-000000000004', 'Ingeniero A', 'Revision estructural nivel A'),
  ('a0000001-0000-4000-8000-000000000005', 'Ingeniero B', 'Captura en campo nivel B')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description);

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

INSERT INTO role_permissions (id, role_id, app_module_id, r, w, u, d)
SELECT UUID(), r.id, m.id, 1, 1, 1, 1
FROM roles r
CROSS JOIN app_modules m
WHERE r.name = 'Administrador'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.app_module_id = m.id
  );

INSERT INTO role_permissions (id, role_id, app_module_id, r, w, u, d)
SELECT UUID(), r.id, m.id,
  CASE m.code WHEN 'tablero' THEN 1 WHEN 'aviso' THEN 1 WHEN 'fotos' THEN 1 ELSE 0 END,
  CASE m.code WHEN 'tablero' THEN 1 ELSE 0 END,
  CASE m.code WHEN 'tablero' THEN 1 ELSE 0 END,
  0
FROM roles r
CROSS JOIN app_modules m
WHERE r.name = 'Coordinador'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.app_module_id = m.id
  );

INSERT INTO role_permissions (id, role_id, app_module_id, r, w, u, d)
SELECT UUID(), r.id, m.id,
  CASE m.code WHEN 'moderacion' THEN 1 WHEN 'fotos' THEN 1 ELSE 0 END,
  CASE m.code WHEN 'moderacion' THEN 1 ELSE 0 END,
  CASE m.code WHEN 'moderacion' THEN 1 ELSE 0 END,
  CASE m.code WHEN 'moderacion' THEN 1 ELSE 0 END
FROM roles r
CROSS JOIN app_modules m
WHERE r.name = 'Moderador'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.app_module_id = m.id
  );

INSERT INTO role_permissions (id, role_id, app_module_id, r, w, u, d)
SELECT UUID(), r.id, m.id,
  CASE m.code WHEN 'revision' THEN 1 WHEN 'aviso' THEN 1 WHEN 'fotos' THEN 1 ELSE 0 END,
  CASE m.code WHEN 'revision' THEN 1 WHEN 'fotos' THEN 1 ELSE 0 END,
  CASE m.code WHEN 'revision' THEN 1 ELSE 0 END,
  0
FROM roles r
CROSS JOIN app_modules m
WHERE r.name = 'Ingeniero A'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.app_module_id = m.id
  );

INSERT INTO role_permissions (id, role_id, app_module_id, r, w, u, d)
SELECT UUID(), r.id, m.id,
  CASE m.code WHEN 'campo' THEN 1 WHEN 'aviso' THEN 1 WHEN 'fotos' THEN 1 ELSE 0 END,
  CASE m.code WHEN 'campo' THEN 1 WHEN 'fotos' THEN 1 ELSE 0 END,
  CASE m.code WHEN 'campo' THEN 1 ELSE 0 END,
  0
FROM roles r
CROSS JOIN app_modules m
WHERE r.name = 'Ingeniero B'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.app_module_id = m.id
  );

UPDATE usuarios u
JOIN roles r ON r.name = 'Administrador'
SET u.role_id = r.id
WHERE u.role_id IS NULL;

UPDATE usuarios u JOIN roles r ON r.name = 'Moderador' SET u.role_id = r.id WHERE u.email = 'moderador@ejemplo.co';
UPDATE usuarios u JOIN roles r ON r.name = 'Ingeniero A' SET u.role_id = r.id WHERE u.email = 'ing.a@ejemplo.co';
UPDATE usuarios u JOIN roles r ON r.name = 'Ingeniero B' SET u.role_id = r.id WHERE u.email = 'ing.b@ejemplo.co';
UPDATE usuarios u JOIN roles r ON r.name = 'Coordinador' SET u.role_id = r.id WHERE u.email = 'coord@ejemplo.co';

SELECT 'roles' AS tabla, COUNT(*) AS filas FROM roles
UNION ALL SELECT 'app_modules', COUNT(*) FROM app_modules
UNION ALL SELECT 'role_permissions', COUNT(*) FROM role_permissions;

SELECT id, name FROM roles ORDER BY name;
SELECT u.email, r.name AS role_name FROM usuarios u LEFT JOIN roles r ON r.id = u.role_id;
