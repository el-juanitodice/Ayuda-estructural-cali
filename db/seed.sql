-- =====================================================================
-- Datos semilla — SOLO DESARROLLO
-- No ejecutar en producción.
-- =====================================================================

-- Admin inicial. hash_clave en NULL a propósito: debe definirla por enlace de alta.
INSERT INTO usuarios (email, nombre, rol, telefono)
VALUES ('admin@ejemplo.co', 'Administrador', 'admin', '3000000000');

-- Moderador
INSERT INTO usuarios (email, nombre, rol, telefono, creado_por)
VALUES ('moderador@ejemplo.co', 'María Moderadora', 'moderador', '3000000001', 1);

-- Ingeniero nivel A (matrícula verificada: sin esto el CHECK lo rechaza)
INSERT INTO usuarios (email, nombre, rol, telefono, matricula, profesion,
                      matricula_verificada_por, matricula_verificada_en, creado_por)
VALUES ('ing.a@ejemplo.co', 'Carlos Estructural', 'ingeniero_a', '3000000002',
        '76202-000000', 'Ingeniero Civil', 2, now(), 1);

-- Ingeniero nivel B
INSERT INTO usuarios (email, nombre, rol, telefono, matricula, profesion,
                      matricula_verificada_por, matricula_verificada_en, creado_por)
VALUES ('ing.b@ejemplo.co', 'Laura Campo', 'ingeniero_b', '3000000003',
        '76202-111111', 'Arquitecta', 2, now(), 1);

-- Coordinador
INSERT INTO usuarios (email, nombre, rol, telefono, creado_por)
VALUES ('coord@ejemplo.co', 'Coordinación Comuna 19', 'coordinador', '3000000004', 1);

-- ---------------------------------------------------------------------
-- Reportes de prueba en barrios reales de Cali
-- ---------------------------------------------------------------------

INSERT INTO reportes (consecutivo, reportante_nombre, reportante_telefono,
  reportante_relacion, direccion, barrio, comuna, geom, precision_gps_m,
  tipo_edificacion, pisos_declarados, unidades_declaradas, habitada,
  uso_declarado, descripcion, estado)
VALUES
-- Nuevo, sin validar
('CAL-2026-00001', 'Ana Gómez', '3101111111', 'propietario',
 'Carrera 39 # 5-20', 'San Fernando', '19',
 ST_SetSRID(ST_MakePoint(-76.5432, 3.4212), 4326)::geography, 12,
 'casa', 2, 1, true, 1,
 'Grietas en la pared de la sala después del sismo', 'nuevo'),

-- Validado → punto gris
('CAL-2026-00002', 'Pedro Ruiz', '3102222222', 'administrador',
 'Calle 5 # 38-45', 'Tequendama', '19',
 ST_SetSRID(ST_MakePoint(-76.5501, 3.4165), 4326)::geography, 8,
 'edificio', 6, 24, true, 1,
 'Fisuras en columnas del parqueadero, varios apartamentos afectados', 'validado'),

-- Escalado a nivel A: uso salud + más de 3 pisos
('CAL-2026-00003', 'Sandra Vélez', '3103333333', 'empleado',
 'Carrera 100 # 11-60', 'Ciudad Jardín', '22',
 ST_SetSRID(ST_MakePoint(-76.5289, 3.3721), 4326)::geography, 15,
 'edificio', 5, 1, true, 4,
 'Centro médico con daños visibles en fachada y cielo raso caído', 'validado'),

-- Sistema vulnerable
('CAL-2026-00004', 'José Ramírez', '3104444444', 'propietario',
 'Calle 12 # 3-15', 'San Antonio', '3',
 ST_SetSRID(ST_MakePoint(-76.5405, 3.4487), 4326)::geography, 20,
 'casa', 1, 1, true, 1,
 'Casa antigua de tapia, se abrió una grieta grande en el muro del patio', 'validado');

-- Marcar escalación en los que corresponde
UPDATE reportes SET requiere_nivel_a = true,
       motivo_escalacion = ARRAY['uso_indispensable','mas_de_3_pisos']
WHERE consecutivo = 'CAL-2026-00003';

UPDATE reportes SET requiere_nivel_a = true,
       motivo_escalacion = ARRAY['sistema_vulnerable']
WHERE consecutivo = 'CAL-2026-00004';

UPDATE reportes SET validado_por = 2, validado_en = now(),
       notas_llamada = 'Confirmado telefónicamente con el reportante.'
WHERE estado = 'validado';

-- ---------------------------------------------------------------------
-- Verificación
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF (SELECT count(*) FROM usuarios) < 5 THEN
    RAISE EXCEPTION 'Faltan usuarios semilla';
  END IF;
  RAISE NOTICE 'Semilla cargada: % usuarios, % reportes',
    (SELECT count(*) FROM usuarios), (SELECT count(*) FROM reportes);
END $$;
