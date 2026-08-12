-- Migración 002 — Secuencia para el consecutivo visible al ciudadano.
-- Formato: CAL-2026-00123. La semilla ya usa hasta 00004; arrancamos en 100
-- para no chocar con datos de desarrollo.

CREATE SEQUENCE IF NOT EXISTS seq_consecutivo_reporte START 100;

CREATE OR REPLACE FUNCTION siguiente_consecutivo() RETURNS TEXT AS $$
  SELECT 'CAL-' || to_char(now(), 'YYYY') || '-' ||
         lpad(nextval('seq_consecutivo_reporte')::text, 5, '0');
$$ LANGUAGE sql;
