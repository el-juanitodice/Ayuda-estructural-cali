-- Migración 001 — Fotos pendientes de confirmar.
--
-- ¿Por qué? /fotos/prefirmar reserva las llaves del bucket, pero la fila en
-- `fotos` solo se crea en /fotos/confirmar (cuando ya sabemos que los objetos
-- llegaron). Entre uno y otro puede pasar cualquier cosa: sin señal, celular
-- apagado, reintento a las 3 horas. Esta tabla guarda esa intención.
--
-- No toca schema.sql (BRIEF §6: se extiende con migraciones).

CREATE TABLE IF NOT EXISTS fotos_pendientes (
  uuid         UUID PRIMARY KEY,              -- el del cliente: idempotencia
  reporte_id   BIGINT NOT NULL REFERENCES reportes(id) ON DELETE CASCADE,
  origen       TEXT NOT NULL CHECK (origen IN ('ciudadano','ingeniero_b','ingeniero_a')),
  subida_por   BIGINT REFERENCES usuarios(id),

  categoria    TEXT NOT NULL,
  piso         TEXT,

  key_full     TEXT NOT NULL,
  key_thumb    TEXT NOT NULL,
  bytes_full   INTEGER,
  bytes_thumb  INTEGER,

  creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_fotos_pendientes_reporte ON fotos_pendientes(reporte_id);

-- El worker de mantenimiento (ARQUITECTURA §1) limpia las pendientes con más
-- de 7 días: si en una semana la foto no llegó, ya no va a llegar.
