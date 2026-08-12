-- =====================================================================
-- Plataforma de inspección post-sísmica — Cali
-- PostgreSQL 16 + PostGIS
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- búsqueda por dirección
CREATE EXTENSION IF NOT EXISTS citext;     -- email case-insensitive

-- =====================================================================
-- 1. USUARIOS  (registro cerrado: solo el admin global crea cuentas)
-- =====================================================================

CREATE TYPE rol_usuario AS ENUM (
  'admin', 'coordinador', 'moderador', 'ingeniero_a', 'ingeniero_b'
);

CREATE TABLE usuarios (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  uuid            UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  email           CITEXT NOT NULL UNIQUE,
  nombre          TEXT NOT NULL,
  telefono        TEXT,
  rol             rol_usuario NOT NULL,

  -- Credenciales. El admin NO define la contraseña: se envía enlace de alta.
  hash_clave      TEXT,                       -- argon2id. NULL = aún no la define
  clave_definida_en TIMESTAMPTZ,

  -- Verificación profesional (obligatoria para ingeniero_a / ingeniero_b)
  matricula       TEXT,                       -- tarjeta profesional COPNIA
  profesion       TEXT,                       -- ing. civil, arquitecto, técnico...
  matricula_verificada_por BIGINT REFERENCES usuarios(id),
  matricula_verificada_en  TIMESTAMPTZ,
  matricula_evidencia_url  TEXT,              -- captura de la consulta COPNIA

  -- Control de acceso
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  intentos_fallidos SMALLINT NOT NULL DEFAULT 0,
  bloqueado_hasta TIMESTAMPTZ,
  ultimo_acceso   TIMESTAMPTZ,

  creado_por      BIGINT REFERENCES usuarios(id),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Un ingeniero sin matrícula verificada no debe existir
  CONSTRAINT ck_ingeniero_matricula CHECK (
    rol NOT IN ('ingeniero_a','ingeniero_b')
    OR (matricula IS NOT NULL AND matricula_verificada_en IS NOT NULL)
  )
);

-- Enlace de un solo uso: alta de contraseña y recuperación
CREATE TABLE tokens_acceso (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id  BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,           -- sha256 del token, nunca el token
  proposito   TEXT NOT NULL CHECK (proposito IN ('alta_clave','recuperar_clave')),
  expira_en   TIMESTAMPTZ NOT NULL,
  usado_en    TIMESTAMPTZ,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_tokens_usuario ON tokens_acceso(usuario_id) WHERE usado_en IS NULL;

-- Sesiones en cookie httpOnly (no JWT en localStorage)
CREATE TABLE sesiones (
  id           TEXT PRIMARY KEY,              -- id opaco, 32 bytes aleatorios
  usuario_id   BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  ip           INET,
  user_agent   TEXT,
  expira_en    TIMESTAMPTZ NOT NULL,
  revocada_en  TIMESTAMPTZ,
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_sesiones_usuario ON sesiones(usuario_id);

-- =====================================================================
-- 2. REPORTES CIUDADANOS
-- =====================================================================

CREATE TYPE estado_reporte AS ENUM (
  'nuevo',            -- recién enviado, invisible en mapas
  'validado',         -- moderador llamó y confirmó → punto GRIS
  'descartado',
  'asignado',
  'en_captura',
  'en_revision_a',
  'requiere_especialista',
  'vencido',
  'cerrado'           -- dictamen firmado → punto de COLOR
);

CREATE TABLE reportes (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  uuid            UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  consecutivo     TEXT UNIQUE,                -- visible al ciudadano: CAL-2026-00123

  -- Reportante (sin cuenta; el teléfono es obligatorio porque el moderador llama)
  reportante_nombre    TEXT NOT NULL,
  reportante_telefono  TEXT NOT NULL,
  reportante_relacion  TEXT,                  -- propietario, arrendatario, vecino...

  -- Ubicación
  direccion       TEXT NOT NULL,
  barrio          TEXT,
  comuna          TEXT,
  geom            GEOGRAPHY(POINT, 4326) NOT NULL,
  precision_gps_m SMALLINT,

  -- Datos declarados por el ciudadano (NO son dictamen)
  tipo_edificacion   TEXT,                    -- casa, edificio, local...
  pisos_declarados   SMALLINT,
  unidades_declaradas SMALLINT,
  habitada           BOOLEAN,
  uso_declarado      SMALLINT,                -- códigos AIS 1..11
  descripcion        TEXT,

  -- Banderas del formulario que disparan escalación automática
  menciona_colapso     BOOLEAN NOT NULL DEFAULT FALSE,
  menciona_inclinacion BOOLEAN NOT NULL DEFAULT FALSE,
  menciona_geotecnico  BOOLEAN NOT NULL DEFAULT FALSE,

  -- Estado
  estado          estado_reporte NOT NULL DEFAULT 'nuevo',
  motivo_escalacion TEXT[] NOT NULL DEFAULT '{}',
  requiere_nivel_a  BOOLEAN NOT NULL DEFAULT FALSE,
  motivo_descarte   TEXT,

  -- Validación telefónica
  validado_por    BIGINT REFERENCES usuarios(id),
  validado_en     TIMESTAMPTZ,
  notas_llamada   TEXT,

  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_reportes_geom   ON reportes USING GIST (geom);
CREATE INDEX ix_reportes_estado ON reportes(estado, creado_en);
CREATE INDEX ix_reportes_dir    ON reportes USING GIN (direccion gin_trgm_ops);

-- Historial de estados: quién movió qué y cuándo
CREATE TABLE reportes_historial (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reporte_id   BIGINT NOT NULL REFERENCES reportes(id) ON DELETE CASCADE,
  estado_ant   estado_reporte,
  estado_nuevo estado_reporte NOT NULL,
  usuario_id   BIGINT REFERENCES usuarios(id),
  nota         TEXT,
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_hist_reporte ON reportes_historial(reporte_id, creado_en);

-- =====================================================================
-- 3. ASIGNACIONES  (con vencimiento)
-- =====================================================================

CREATE TABLE asignaciones (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reporte_id    BIGINT NOT NULL REFERENCES reportes(id) ON DELETE CASCADE,
  ingeniero_id  BIGINT NOT NULL REFERENCES usuarios(id),
  asignado_por  BIGINT NOT NULL REFERENCES usuarios(id),
  rol_asignado  rol_usuario NOT NULL,         -- ingeniero_a o ingeniero_b
  vence_en      TIMESTAMPTZ NOT NULL,
  abierta_en    TIMESTAMPTZ,                  -- primera vez que el ing. la abrió
  cerrada_en    TIMESTAMPTZ,
  liberada_en   TIMESTAMPTZ,                  -- venció o la devolvió
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Un reporte solo puede tener una asignación viva por rol
CREATE UNIQUE INDEX ux_asignacion_viva
  ON asignaciones(reporte_id, rol_asignado)
  WHERE cerrada_en IS NULL AND liberada_en IS NULL;
CREATE INDEX ix_asig_ingeniero ON asignaciones(ingeniero_id) WHERE cerrada_en IS NULL;
CREATE INDEX ix_asig_vence ON asignaciones(vence_en) WHERE cerrada_en IS NULL AND liberada_en IS NULL;

-- =====================================================================
-- 4. FORMULARIO ÚNICO AIS
-- =====================================================================

CREATE TYPE nivel_riesgo   AS ENUM ('bajo','bajo_medidas','alto','muy_alto');
CREATE TYPE habitabilidad  AS ENUM ('verde','amarillo','naranja','rojo');
CREATE TYPE tipo_inspeccion AS ENUM ('exterior','parcial','completa');

CREATE TABLE formularios_ais (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  uuid            UUID NOT NULL UNIQUE,       -- generado en el cliente (offline)
  reporte_id      BIGINT NOT NULL REFERENCES reportes(id),
  numero_formulario TEXT UNIQUE,

  -- S1 catastral
  comuna TEXT, barrio TEXT, sector TEXT, manzana TEXT, predio TEXT,

  -- S2 tipo de inspección
  tipo_inspeccion tipo_inspeccion,
  motivo_no_inspeccion TEXT,

  -- S3 identificación
  direccion TEXT, nombre_edificacion TEXT,
  pisos_sobre_terreno SMALLINT, sotanos SMALLINT,
  uso_edificacion SMALLINT, uso_planta_baja SMALLINT,
  frente_m NUMERIC(6,2), fondo_m NUMERIC(6,2),

  -- S4 estructura (códigos AIS)
  sistema_estructural SMALLINT,
  tipo_entrepiso SMALLINT,
  anio_construccion SMALLINT CHECK (anio_construccion BETWEEN 1 AND 4),

  -- S5.1 estabilidad global
  colapso TEXT CHECK (colapso IN ('ninguno','parcial_menor_50','parcial_mayor_50','total')),
  inclinacion TEXT CHECK (inclinacion IN ('ninguna','dudas','evidente')),
  riesgo_estabilidad nivel_riesgo,

  -- S5.2 geotécnico
  asentamiento TEXT CHECK (asentamiento IN ('ninguno','dudas','evidente')),
  falla_talud  TEXT CHECK (falla_talud IN ('ninguno','puntual','general')),
  morfologia_sitio SMALLINT,
  origen_movimiento SMALLINT,
  potencial_reactivacion SMALLINT,
  riesgo_geotecnico nivel_riesgo,

  -- S5.3 / S5.4 (el detalle va en tablas aparte)
  piso_mayor_dano TEXT,
  riesgo_estructural     nivel_riesgo,
  riesgo_no_estructural  nivel_riesgo,

  -- S6 y S7
  porcentaje_dano TEXT CHECK (porcentaje_dano IN
    ('ninguno','0_10','10_30','30_60','60_100','100')),
  habitabilidad_sugerida habitabilidad,   -- calculada de los 4 riesgos
  habitabilidad_final    habitabilidad,   -- la que marcó el ingeniero A
  motivo_discrepancia    TEXT,

  -- S8..S13 campos de baja consulta
  condiciones_preexistentes JSONB NOT NULL DEFAULT '{}',
  recomendaciones           JSONB NOT NULL DEFAULT '{}',
  efecto_ocupantes          JSONB NOT NULL DEFAULT '{}',
  ocupacion                 JSONB NOT NULL DEFAULT '{}',
  contacto_predio           JSONB NOT NULL DEFAULT '{}',
  comentarios TEXT,
  esquema_svg TEXT,                        -- dibujo a mano alzada

  -- Trazabilidad del dictamen
  capturado_por   BIGINT REFERENCES usuarios(id),
  capturado_en    TIMESTAMPTZ,
  visita_presencial_b BOOLEAN,
  firmado_por     BIGINT REFERENCES usuarios(id),
  firmado_en      TIMESTAMPTZ,
  visita_presencial_a BOOLEAN,
  firma_imagen_url TEXT,

  estado TEXT NOT NULL DEFAULT 'borrador'
    CHECK (estado IN ('borrador','capturado','firmado')),

  creado_offline_en TIMESTAMPTZ,
  sincronizado_en   TIMESTAMPTZ,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Un formulario firmado exige los cuatro riesgos y la habitabilidad
  CONSTRAINT ck_firmado_completo CHECK (
    estado <> 'firmado' OR (
      riesgo_estabilidad IS NOT NULL AND riesgo_geotecnico IS NOT NULL AND
      riesgo_estructural IS NOT NULL AND riesgo_no_estructural IS NOT NULL AND
      habitabilidad_final IS NOT NULL AND firmado_por IS NOT NULL
    )
  ),
  -- Si el color difiere del sugerido, hay que justificarlo
  CONSTRAINT ck_discrepancia CHECK (
    habitabilidad_final IS NULL
    OR habitabilidad_final = habitabilidad_sugerida
    OR motivo_discrepancia IS NOT NULL
  )
);

CREATE INDEX ix_form_reporte ON formularios_ais(reporte_id);
CREATE INDEX ix_form_habit   ON formularios_ais(habitabilidad_final) WHERE estado = 'firmado';

-- Matriz de daños: severidad × porcentaje. Suma 100 por elemento.
CREATE TABLE danos (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  formulario_id BIGINT NOT NULL REFERENCES formularios_ais(id) ON DELETE CASCADE,
  grupo         TEXT NOT NULL CHECK (grupo IN ('estructural','no_estructural')),
  elemento      TEXT NOT NULL,   -- vigas, columnas, nudos, entrepisos, cubierta...
  pct_ninguno   SMALLINT NOT NULL DEFAULT 0,
  pct_leve      SMALLINT NOT NULL DEFAULT 0,
  pct_moderado  SMALLINT NOT NULL DEFAULT 0,
  pct_fuerte    SMALLINT NOT NULL DEFAULT 0,
  pct_severo    SMALLINT NOT NULL DEFAULT 0,
  UNIQUE (formulario_id, grupo, elemento),
  CONSTRAINT ck_suma_100 CHECK (
    pct_ninguno + pct_leve + pct_moderado + pct_fuerte + pct_severo = 100
  )
);

-- =====================================================================
-- 5. FOTOS  (hasta 100 por reporte, comprimidas en el cliente)
-- =====================================================================

CREATE TABLE fotos (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  uuid         UUID NOT NULL UNIQUE,          -- del cliente → subida idempotente
  reporte_id   BIGINT NOT NULL REFERENCES reportes(id) ON DELETE CASCADE,
  origen       TEXT NOT NULL CHECK (origen IN ('ciudadano','ingeniero_b','ingeniero_a')),
  subida_por   BIGINT REFERENCES usuarios(id),

  categoria    TEXT NOT NULL,                 -- fachada, columnas, grietas...
  piso         TEXT,
  nota         TEXT,

  key_full     TEXT NOT NULL,                 -- object storage
  key_thumb    TEXT NOT NULL,
  bytes_full   INTEGER,
  ancho        SMALLINT,
  alto         SMALLINT,

  exif_geom    GEOGRAPHY(POINT, 4326),        -- corrobora que se tomó en el predio
  tomada_en    TIMESTAMPTZ,
  orden        SMALLINT NOT NULL DEFAULT 0,
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_fotos_reporte ON fotos(reporte_id, categoria, orden);

-- Tope de 100 fotos por reporte, aplicado en la base
CREATE OR REPLACE FUNCTION fn_limite_fotos() RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT count(*) FROM fotos WHERE reporte_id = NEW.reporte_id) >= 100 THEN
    RAISE EXCEPTION 'Límite de 100 fotos por reporte alcanzado';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_limite_fotos BEFORE INSERT ON fotos
  FOR EACH ROW EXECUTE FUNCTION fn_limite_fotos();

-- =====================================================================
-- 6. AUDITORÍA  (toda lectura de datos personales queda registrada)
-- =====================================================================

CREATE TABLE auditoria (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id  BIGINT REFERENCES usuarios(id),
  accion      TEXT NOT NULL,   -- ver_telefono, validar, asignar, firmar, exportar
  entidad     TEXT NOT NULL,
  entidad_id  BIGINT,
  detalle     JSONB,
  ip          INET,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_audit_usuario ON auditoria(usuario_id, creado_en DESC);
CREATE INDEX ix_audit_entidad ON auditoria(entidad, entidad_id);

-- =====================================================================
-- 7. VISTA PÚBLICA  (gris / color, ubicación difuminada, sin datos personales)
-- =====================================================================

CREATE VIEW mapa_publico AS
SELECT
  r.uuid,
  r.consecutivo,
  r.barrio,
  r.comuna,
  -- Redondeo a ~100 m: nunca exponer la coordenada exacta
  ST_SnapToGrid(r.geom::geometry, 0.001)::geography AS geom_aprox,
  CASE WHEN r.estado = 'cerrado' THEN f.habitabilidad_final::text
       ELSE 'gris' END AS color,
  (r.estado = 'cerrado')                            AS con_dictamen,
  f.firmado_en                                      AS dictaminado_en
FROM reportes r
LEFT JOIN formularios_ais f
       ON f.reporte_id = r.id AND f.estado = 'firmado'
WHERE r.estado IN ('validado','asignado','en_captura',
                   'en_revision_a','requiere_especialista','cerrado');
