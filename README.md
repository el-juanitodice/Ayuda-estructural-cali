# Inspección Post-Sísmica — Cali

**En producción: https://www.ayudaestructuralcali.org**

Herramienta de apoyo para los ingenieros y arquitectos que evalúan edificaciones
en Cali tras el sismo M7.4 del 10 de agosto de 2026.

Digitaliza el **Formulario Único de Inspección de Edificaciones Después de un Sismo**
de la Asociación Colombiana de Ingeniería Sísmica (AIS), funciona sin conexión,
y conecta las solicitudes ciudadanas con los profesionales que hacen la evaluación.

> ⚠️ **Este sistema no evalúa edificaciones.** Captura, valida coherencia y coordina.
> Todo dictamen lo emite y firma un ingeniero con matrícula profesional verificada.
>
> 🚨 **Emergencia con riesgo inmediato para la vida: llame al 123.**

---

## Estado actual (agosto 2026)

Los 10 puntos del orden de construcción del BRIEF están **implementados y desplegados**:

| # | Módulo | Estado |
|---|---|---|
| 1 | Compresión de fotos en Web Worker + cola de subida persistente (Dexie) | ✅ |
| 2 | Auth: alta por enlace único, Argon2id, sesión httpOnly, re-auth al firmar | ✅ |
| 3 | Formulario ciudadano + corte de emergencia 123 (cliente Y servidor) | ✅ |
| 4 | Panel de moderador: cola priorizada, validar/descartar/asignar, auditoría | ✅ |
| 5 | Mapa público gris/color con leyenda obligatoria y ubicación difuminada | ✅ |
| 6 | Formulario AIS offline para captura de campo (ingeniero B) | ✅ |
| 7 | Revisión y firma (ingeniero A) + verificación de coherencia AIS | ✅ |
| 8 | Aviso imprimible de habitabilidad con QR (imprimir → PDF del navegador) | ✅ |
| 9 | Reglas de escalación automática a nivel A | ✅ |
| 10 | Tablero del coordinador + exportación CSV auditada | ✅ |

**Pendiente / se necesita ayuda:** ver [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Documentación

| Archivo | Contenido |
|---|---|
| **[BRIEF.md](BRIEF.md)** | **Empieza aquí.** Restricciones críticas no negociables |
| [ARQUITECTURA.md](ARQUITECTURA.md) | Servicios en Railway, correo, fotos, seguridad, respaldos |
| [API.md](API.md) | Endpoints |
| [FLUJOS.md](FLUJOS.md) | Estados del reporte, escalación, recorridos por rol |
| [DESPLIEGUE.md](DESPLIEGUE.md) | Despliegue en Railway paso a paso |
| [db/schema.sql](db/schema.sql) | Esquema PostgreSQL + PostGIS (no reescribir: migrar) |
| [shared/ais.js](shared/ais.js) | Catálogos y reglas AIS — importado sin modificar por api y web |
| [MANUAL-AyudaEstructuralCali.pdf](MANUAL-AyudaEstructuralCali.pdf) | Manual de uso para ciudadanía y personal |

---

## Estructura

```
.
├── BRIEF.md                     ← léelo ANTES de escribir código
├── shared/
│   └── ais.js                   ← LA regla de habitabilidad. Un solo archivo,
│                                   cliente y servidor. No duplicar jamás.
├── db/
│   ├── schema.sql               ← esquema probado. Se extiende con migraciones
│   ├── migraciones/             ← 001 fotos_pendientes, 002 consecutivo
│   └── seed.sql                 ← SOLO desarrollo
├── api/                         ← Fastify (Node 22)
│   └── src/
│       ├── server.js            ← arranque, salud, estáticos del front
│       ├── esquema.js           ← aplica schema+migraciones al arrancar (idempotente)
│       ├── auth/sesiones.js     ← sesiones opacas en cookie httpOnly
│       ├── rutas/
│       │   ├── auth.js          ← login, alta/recuperación, ticket de firma
│       │   ├── reportes.js      ← reporte ciudadano, mapa público, estado
│       │   ├── fotos.js         ← prefirmar/confirmar (S3, el API nunca ve bytes)
│       │   ├── moderacion.js    ← cola, validar, descartar, asignar
│       │   ├── campo.js         ← formulario AIS, revisión, FIRMA
│       │   ├── tablero.js       ← coordinador: cobertura, discrepancias, CSV
│       │   └── admin.js         ← usuarios
│       ├── auditoria.js         ← Ley 1581: toda lectura de teléfono queda registrada
│       ├── correo.js  sms.js  s3.js  mantenimiento.js  config.js  db.js
├── web/                         ← Vite + Preact + Dexie (offline-first)
│   └── src/
│       ├── app.js               ← SPA, router por hash, navegación por rol
│       ├── fotos/               ← compresor (Web Worker), cola persistente, EXIF
│       ├── campo/sync.js        ← sincronización de formularios offline
│       └── paginas/             ← reportar, estado, mapa, moderación, ingeniero,
│                                   dictamen, aviso, tablero, admin, login
└── railway.json                 ← build y healthcheck de Railway
```

---

## Desarrollo local

Requisitos: Node ≥ 22 y Docker (para Postgres con PostGIS).

```bash
# 1. Base de datos (la imagen normal de Postgres NO sirve: falta PostGIS)
docker run -d --name pg-cali -p 5432:5432 \
  -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=cali \
  postgis/postgis:16-3.4

# 2. Variables
cp .env.example .env    # completa SESSION_SECRET y las S3_* (o usa MinIO local)

# 3. Instalar y correr
npm install
npm run dev             # api en :3000, web (Vite) en :5173 con proxy /api
```

El esquema y las migraciones se aplican **solos** al arrancar el api si la base
está vacía (`api/src/esquema.js`), y se crea un admin inicial cuyo enlace de
contraseña sale en el log si no hay `RESEND_API_KEY`.

Producción: ver [DESPLIEGUE.md](DESPLIEGUE.md). Infraestructura actual:
Railway (servicio Node + `postgis/postgis:16-3.4` con volumen + Bucket privado
para fotos), correo por Resend, dominio en Hostinger.

---

## Los roles (resumen)

| Rol | Función | Ve teléfonos |
|---|---|---|
| Ciudadano | Reporta sin cuenta, sube hasta 100 fotos | — |
| Moderador | Llama y valida, asigna ingeniero | Sí (auditado) |
| Ingeniero B | Captura de campo con el formulario AIS. **No dictamina** | No |
| Ingeniero A | Asigna los 4 riesgos, define color, **firma** (re-auth) | Del predio |
| Coordinador | Tablero, prioriza, escala (nunca desescala), exporta | Sí (auditado) |
| Admin | Crea cuentas, verifica matrículas COPNIA | Sí (auditado) |

Solo el admin crea cuentas. No hay registro abierto. La distinción A/B es legal.

---

## La regla de habitabilidad (AIS)

Determinada por los cuatro niveles de riesgo que asigna el ingeniero A:

| Riesgos | Resultado |
|---|---|
| Los cuatro en bajo | 🟢 Habitable |
| Al menos uno en «bajo con medidas» | 🟡 Uso restringido |
| Al menos uno en alto | 🟠 No habitable |
| Al menos uno en muy alto, o **más de dos** en alto | 🔴 Peligro de colapso |

Vive en `shared/ais.js` y solo ahí. El cliente la usa offline para advertir;
el servidor la recalcula al firmar y nunca confía en el valor del cliente.
El sistema **avisa** discrepancias y exige justificación — jamás sobreescribe
el criterio del profesional.

---

## Cómo ayudar

Lee [CONTRIBUTING.md](CONTRIBUTING.md). En corto: hay trabajo de código
(proveedor de SMS, exportación PDF del formulario oficial, pruebas), de campo
(ingenieros con matrícula COPNIA) y de difusión (el manual PDF de este repo es
de libre circulación).

## Licencia

Software de interés público. Uso libre por entidades de gestión del riesgo,
alcaldías, gremios profesionales y organizaciones de respuesta a emergencias.
