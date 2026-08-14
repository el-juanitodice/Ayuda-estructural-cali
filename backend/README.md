# Backend — NestJS + TypeORM + MySQL

API nueva en TypeScript. Convive con `api/` (Fastify + PostgreSQL) sin reemplazarla.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | NestJS 11 |
| ORM | TypeORM |
| Base de datos | MySQL 8 |
| Auth | JWT (Bearer) + Passport |
| Validación | class-validator + class-transformer |
| Reglas AIS | `shared/ais.js` (sin modificar) |

## Arranque

```bash
cp backend/.env.example backend/.env
# Completa JWT_SECRET y credenciales MySQL

npm --prefix backend install
npm --prefix backend run start:dev
```

Puerto por defecto: **3001** (el legacy `api/` sigue en 3000).

Health: `GET http://localhost:3001/api/v1/salud`

## Semilla de desarrollo (MySQL)

```bash
npm run backend:seed
# o: npm run db:seed --workspace backend
```

Carga `database/seed.mysql.sql` (**borra** usuarios y reportes existentes).

| Email | Rol | Contraseña |
|---|---|---|
| `admin@ejemplo.co` | admin | `Admin123456789` |
| `moderador@ejemplo.co` | moderador | `Admin123456789` |
| `ing.a@ejemplo.co` | ingeniero_a | `Admin123456789` |
| `ing.b@ejemplo.co` | ingeniero_b | `Admin123456789` |
| `coord@ejemplo.co` | coordinador | `Admin123456789` |

Incluye 4 reportes de prueba (1 `nuevo`, 3 `validado` → visibles en mapa con `MAPA_INCLUIR_NUEVO=true` o tras validación).

## Módulos implementados (fase 1)

| Módulo | Rutas | Estado |
|---|---|---|
| `SaludModule` | `GET /salud` | ✅ |
| `AuthModule` | `POST /auth/login`, `/definir-clave`, `/recuperar`, `GET /auth/yo` | ✅ |
| `ReportesModule` | `POST /reportes`, `GET /mapa`, `GET /reportes/:consecutivo/estado` | ✅ |
| `FotosModule` | `POST /fotos/subir`, `GET /fotos/:uuid` | ✅ |

## Almacenamiento de imágenes (local)

A diferencia del legacy (`api/` + S3), en `backend/`:

| Qué | Dónde |
|---|---|
| Bytes de la imagen | Disco local `backend/uploads/` (configurable con `UPLOAD_DIR`) |
| Referencia en MySQL | `fotos.ruta_full` y `fotos.ruta_thumb` (VARCHAR, ruta relativa) |
| Metadatos EXIF | Columna JSON `fotos.exif` (`lat`, `lng`, `tomada_en`) |

### Subir foto

`POST /api/v1/fotos/subir` — `multipart/form-data`:

| Campo | Tipo |
|---|---|
| `reporte_uuid` | text |
| `uuid` | text (UUID cliente, idempotente) |
| `categoria` | text |
| `piso` | text opcional |
| `ancho`, `alto` | number opcional |
| `exif` | JSON string opcional |
| `full` | archivo imagen |
| `thumb` | archivo imagen |

Respuesta: `{ ok, uuid, ruta_full, ruta_thumb }` — las rutas son relativas, no URLs públicas.

### Ver foto (autenticado)

`GET /api/v1/fotos/:uuid?tam=thumb|full` — devuelve el binario con `Content-Type` correcto.

Bearer token opcional en subida: si el ingeniero envía JWT, `origen` queda registrado como `ingeniero_a` / `ingeniero_b`.

## Pendiente (basado en api legacy)

- `ModeracionModule`, `AdminModule`, `CampoModule`, `TableroModule`, `FotosModule`
- Correo (Resend), S3 presigned, SMS, auditoría, worker de mantenimiento

## Diferencias con `api/`

| Aspecto | `api/` legacy | `backend/` nuevo |
|---|---|---|
| Auth | Cookie httpOnly | JWT Bearer |
| BD | PostgreSQL + PostGIS | MySQL + lat/lng DECIMAL |
| Framework | Fastify | NestJS |

> **Nota:** El BRIEF original usa PostGIS para consultas geoespaciales. MySQL cubre el MVP; si hace falta radio/comuna espacial avanzado, evaluar migración a Postgres en TypeORM más adelante.

## Estructura

```
backend/src/
├── main.ts
├── app.module.ts
├── config/
├── common/          # guards, decorators, filters, enums
├── database/        # TypeORM + entidades
├── modules/
│   ├── auth/
│   ├── reportes/
│   └── salud/
└── shared/ais/      # wrapper de shared/ais.js
```
