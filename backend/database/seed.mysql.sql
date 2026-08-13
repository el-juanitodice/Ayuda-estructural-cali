-- =====================================================================
-- Semilla MySQL — SOLO DESARROLLO (backend NestJS)
-- No ejecutar en producción.
--
-- Contraseña de todos los usuarios: Admin123456789
-- (hash argon2id, mismos parámetros que AuthService)
--
-- Ejecutar desde la raíz del monorepo:
--   npm run db:seed --workspace backend
-- o manualmente:
--   mysql -u root -p cali_inspeccion < backend/database/seed.mysql.sql
-- =====================================================================

USE cali_inspeccion;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE tokens_acceso;
TRUNCATE TABLE fotos;
TRUNCATE TABLE formularios_ais;
TRUNCATE TABLE reportes;
TRUNCATE TABLE usuarios;

SET FOREIGN_KEY_CHECKS = 1;

-- Hash de "Admin123456789"
SET @hash_dev = '$argon2id$v=19$m=19456,t=2,p=1$FBq4TGAAjx5mlTE0srno1g$acyJWPyvk08NRy7TVn9QL/VsojKlrcHewZFbDwErv/k';

INSERT INTO usuarios (
  uuid, email, nombre, telefono, rol, hash_clave, clave_definida_en,
  matricula, profesion, matricula_verificada_en, activo
) VALUES
(
  '11111111-1111-4111-8111-111111111101',
  'admin@ejemplo.co',
  'Administrador',
  '3000000000',
  'admin',
  @hash_dev,
  NOW(),
  NULL,
  NULL,
  NULL,
  1
),
(
  '11111111-1111-4111-8111-111111111102',
  'moderador@ejemplo.co',
  'María Moderadora',
  '3000000001',
  'moderador',
  @hash_dev,
  NOW(),
  NULL,
  NULL,
  NULL,
  1
),
(
  '11111111-1111-4111-8111-111111111103',
  'ing.a@ejemplo.co',
  'Carlos Estructural',
  '3000000002',
  'ingeniero_a',
  @hash_dev,
  NOW(),
  '76202-000000',
  'Ingeniero Civil',
  NOW(),
  1
),
(
  '11111111-1111-4111-8111-111111111104',
  'ing.b@ejemplo.co',
  'Laura Campo',
  '3000000003',
  'ingeniero_b',
  @hash_dev,
  NOW(),
  '76202-111111',
  'Arquitecta',
  NOW(),
  1
),
(
  '11111111-1111-4111-8111-111111111105',
  'coord@ejemplo.co',
  'Coordinación Comuna 19',
  '3000000004',
  'coordinador',
  @hash_dev,
  NOW(),
  NULL,
  NULL,
  NULL,
  1
);

-- Reportes de prueba en Cali (lat/lng DECIMAL; difuminación en la API)
INSERT INTO reportes (
  uuid, consecutivo, reportante_nombre, reportante_telefono, reportante_relacion,
  direccion, barrio, comuna, lat, lng, precision_gps_m,
  tipo_edificacion, pisos_declarados, unidades_declaradas, habitada,
  uso_declarado, descripcion, menciona_colapso, estado, requiere_nivel_a, validado_en
) VALUES
(
  '22222222-2222-4222-8222-222222222201',
  'CAL-2026-00001',
  'Ana Gómez',
  '3101111111',
  'propietario',
  'Carrera 39 # 5-20',
  'San Fernando',
  '19',
  3.4212000,
  -76.5432000,
  12,
  'casa',
  2,
  1,
  1,
  1,
  'Grietas en la pared de la sala después del sismo',
  0,
  'nuevo',
  0,
  NULL
),
(
  '22222222-2222-4222-8222-222222222202',
  'CAL-2026-00002',
  'Pedro Ruiz',
  '3102222222',
  'administrador',
  'Calle 5 # 38-45',
  'Tequendama',
  '19',
  3.4165000,
  -76.5501000,
  8,
  'edificio',
  6,
  24,
  1,
  1,
  'Fisuras en columnas del parqueadero, varios apartamentos afectados',
  0,
  'validado',
  0,
  NOW()
),
(
  '22222222-2222-4222-8222-222222222203',
  'CAL-2026-00003',
  'Sandra Vélez',
  '3103333333',
  'empleado',
  'Carrera 100 # 11-60',
  'Ciudad Jardín',
  '22',
  3.3721000,
  -76.5289000,
  15,
  'edificio',
  5,
  1,
  1,
  4,
  'Centro médico con daños visibles en fachada y cielo raso caído',
  0,
  'validado',
  1,
  NOW()
),
(
  '22222222-2222-4222-8222-222222222204',
  'CAL-2026-00004',
  'José Ramírez',
  '3104444444',
  'propietario',
  'Calle 12 # 3-15',
  'San Antonio',
  '3',
  3.4487000,
  -76.5405000,
  20,
  'casa',
  1,
  1,
  1,
  1,
  'Casa antigua de tapia, se abrió una grieta grande en el muro del patio',
  0,
  'validado',
  1,
  NOW()
);

UPDATE reportes
SET estado = 'en_revision_a'
WHERE uuid = '22222222-2222-4222-8222-222222222204';

INSERT INTO formularios_ais (
  uuid, reporte_id, estado, capturado_por, capturado_en,
  visita_presencial_b, sistema_estructural, colapso, inclinacion,
  porcentaje_dano, piso_mayor_dano, comentarios, pisos_sobre_terreno,
  anio_construccion, asentamiento, falla_talud, danos
) VALUES (
  '33333333-3333-4333-8333-333333333301',
  (SELECT id FROM reportes WHERE uuid = '22222222-2222-4222-8222-222222222204'),
  'capturado',
  (SELECT id FROM usuarios WHERE email = 'ing.b@ejemplo.co'),
  NOW(),
  1,
  21,
  'no',
  'no',
  '30_60',
  '1',
  'Grietas visibles en muros portantes del patio. Refuerzo recomendado en esquinas.',
  1,
  1975,
  'leve',
  'no',
  JSON_ARRAY(
    JSON_OBJECT(
      'grupo', 'estructural',
      'elemento', 'muros_portantes',
      'pct_ninguno', 30,
      'pct_leve', 40,
      'pct_moderado', 20,
      'pct_fuerte', 10,
      'pct_severo', 0
    ),
    JSON_OBJECT(
      'grupo', 'estructural',
      'elemento', 'entrepisos',
      'pct_ninguno', 70,
      'pct_leve', 20,
      'pct_moderado', 10,
      'pct_fuerte', 0,
      'pct_severo', 0
    )
  )
);

SELECT
  (SELECT COUNT(*) FROM usuarios) AS usuarios,
  (SELECT COUNT(*) FROM reportes) AS reportes,
  (SELECT COUNT(*) FROM formularios_ais) AS formularios;
