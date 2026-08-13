-- Schema MySQL inicial — backend NestJS + TypeORM
-- Equivalente simplificado de db/schema.sql (PostgreSQL + PostGIS)
-- Las coordenadas se guardan como DECIMAL; la difuminación ~100 m se aplica en la API.

CREATE DATABASE IF NOT EXISTS cali_inspeccion
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cali_inspeccion;

CREATE TABLE IF NOT EXISTS usuarios (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  telefono VARCHAR(30) NULL,
  rol ENUM('admin','coordinador','moderador','ingeniero_a','ingeniero_b') NOT NULL,
  hash_clave VARCHAR(255) NULL,
  clave_definida_en DATETIME NULL,
  matricula VARCHAR(40) NULL,
  profesion VARCHAR(80) NULL,
  matricula_verificada_en DATETIME NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  intentos_fallidos SMALLINT NOT NULL DEFAULT 0,
  bloqueado_hasta DATETIME NULL,
  ultimo_acceso DATETIME NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tokens_acceso (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  usuario_id BIGINT NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  proposito ENUM('alta_clave','recuperar_clave') NOT NULL,
  expira_en DATETIME NOT NULL,
  usado_en DATETIME NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tokens_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reportes (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  consecutivo VARCHAR(20) NULL UNIQUE,
  reportante_nombre VARCHAR(120) NOT NULL,
  reportante_telefono VARCHAR(20) NOT NULL,
  reportante_relacion VARCHAR(40) NULL,
  direccion VARCHAR(200) NOT NULL,
  barrio VARCHAR(80) NULL,
  comuna VARCHAR(80) NULL,
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  precision_gps_m SMALLINT NULL,
  tipo_edificacion VARCHAR(40) NULL,
  pisos_declarados SMALLINT NULL,
  unidades_declaradas SMALLINT NULL,
  habitada TINYINT(1) NULL,
  uso_declarado SMALLINT NULL,
  descripcion TEXT NULL,
  menciona_colapso TINYINT(1) NOT NULL DEFAULT 0,
  menciona_inclinacion TINYINT(1) NOT NULL DEFAULT 0,
  menciona_geotecnico TINYINT(1) NOT NULL DEFAULT 0,
  estado ENUM(
    'nuevo','validado','descartado','asignado','en_captura',
    'en_revision_a','requiere_especialista','vencido','cerrado'
  ) NOT NULL DEFAULT 'nuevo',
  requiere_nivel_a TINYINT(1) NOT NULL DEFAULT 0,
  motivo_escalacion JSON NULL,
  motivo_descarte VARCHAR(40) NULL,
  notas_llamada TEXT NULL,
  validado_en DATETIME NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS asignaciones (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  reporte_id BIGINT NOT NULL,
  ingeniero_id BIGINT NOT NULL,
  asignado_por BIGINT NOT NULL,
  rol_asignado ENUM('admin','coordinador','moderador','ingeniero_a','ingeniero_b') NOT NULL,
  vence_en DATETIME NOT NULL,
  cerrada_en DATETIME NULL,
  liberada_en DATETIME NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_asig_reporte FOREIGN KEY (reporte_id) REFERENCES reportes(id) ON DELETE CASCADE,
  CONSTRAINT fk_asig_ingeniero FOREIGN KEY (ingeniero_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_asig_asignado_por FOREIGN KEY (asignado_por) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX ix_asig_ingeniero (ingeniero_id, cerrada_en, liberada_en)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS formularios_ais (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  reporte_id BIGINT NOT NULL,
  estado ENUM('borrador','capturado','firmado') NOT NULL DEFAULT 'borrador',
  capturado_por BIGINT NULL,
  capturado_en DATETIME NULL,
  visita_presencial_b TINYINT(1) NULL,
  visita_presencial_a TINYINT(1) NULL,
  sistema_estructural SMALLINT NULL,
  colapso VARCHAR(40) NULL,
  inclinacion VARCHAR(40) NULL,
  porcentaje_dano VARCHAR(40) NULL,
  piso_mayor_dano VARCHAR(10) NULL,
  comentarios TEXT NULL,
  pisos_sobre_terreno SMALLINT NULL,
  anio_construccion SMALLINT NULL,
  asentamiento VARCHAR(40) NULL,
  falla_talud VARCHAR(40) NULL,
  riesgo_estabilidad VARCHAR(20) NULL,
  riesgo_geotecnico VARCHAR(20) NULL,
  riesgo_estructural VARCHAR(20) NULL,
  riesgo_no_estructural VARCHAR(20) NULL,
  habitabilidad_sugerida ENUM('verde','amarillo','naranja','rojo','gris') NULL,
  habitabilidad_final ENUM('verde','amarillo','naranja','rojo','gris') NULL,
  motivo_discrepancia TEXT NULL,
  firmado_por BIGINT NULL,
  firmado_en DATETIME NULL,
  danos JSON NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_formularios_reporte FOREIGN KEY (reporte_id) REFERENCES reportes(id) ON DELETE CASCADE,
  CONSTRAINT fk_form_capturado FOREIGN KEY (capturado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  CONSTRAINT fk_form_firmado FOREIGN KEY (firmado_por) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fotos (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  reporte_id BIGINT NOT NULL,
  origen ENUM('ciudadano','ingeniero_b','ingeniero_a') NOT NULL,
  subida_por BIGINT NULL,
  categoria VARCHAR(60) NOT NULL,
  piso VARCHAR(10) NULL,
  nota VARCHAR(255) NULL,
  -- Solo rutas relativas; los archivos viven en backend/uploads/
  ruta_full VARCHAR(512) NOT NULL,
  ruta_thumb VARCHAR(512) NOT NULL,
  bytes_full INT NULL,
  bytes_thumb INT NULL,
  ancho SMALLINT NULL,
  alto SMALLINT NULL,
  formato VARCHAR(10) NOT NULL DEFAULT 'webp',
  -- Metadatos EXIF (lat, lng, tomada_en) como JSON
  exif JSON NULL,
  orden SMALLINT NOT NULL DEFAULT 0,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fotos_reporte FOREIGN KEY (reporte_id) REFERENCES reportes(id) ON DELETE CASCADE,
  CONSTRAINT fk_fotos_usuario FOREIGN KEY (subida_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX ix_fotos_reporte (reporte_id, categoria, orden)
) ENGINE=InnoDB;
