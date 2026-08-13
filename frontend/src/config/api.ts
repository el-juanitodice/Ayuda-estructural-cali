/**
 * Base URL del backend NestJS (prefijo global `api/v1`).
 *
 * - Dev (PC o móvil en la misma red): `/api/v1` → proxy Vite → backend :3001
 * - Prod: definir `VITE_API_BASE` (URL absoluta del API)
 */
export const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/v1';
