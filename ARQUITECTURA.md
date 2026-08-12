# Arquitectura y despliegue

## 1. Servicios en Railway

```
                    ┌──────────────────┐
   navegador  ───►  │  web  (estático) │
                    └────────┬─────────┘
                             │  fetch
                    ┌────────▼─────────┐        ┌──────────────┐
                    │  api  (Fastify)  │───────►│  Resend API  │  correo
                    └────┬────────┬────┘        └──────────────┘
                         │        │
              ┌──────────▼──┐  ┌──▼───────────────┐
              │  postgres   │  │ bucket-fotos     │
              │  + PostGIS  │  │ (Railway Bucket) │
              └─────────────┘  └──────────────────┘
                         ▲              ▲
                         │              │ subida directa con URL prefirmada
                    ┌────┴─────┐        │
                    │  worker  │        └──── navegador
                    └──────────┘
```

| Servicio | Imagen / build | Notas |
|---|---|---|
| `api` | Node 22, `npm run start` | Health check en `/salud` |
| `web` | Vite build → estático | Puede servirse desde `api` para ahorrar un servicio |
| `postgres` | `postgis/postgis:16-3.4` | **No uses el template base de Postgres:** no trae PostGIS |
| `bucket-fotos` | Railway Bucket | **Privado.** Nunca URLs públicas |
| `worker` | Node 22, `npm run worker` | Opcional al inicio: puede ir dentro de `api` con `setInterval` |

### Sobre el worker

Con el volumen esperado (cientos de reportes/día) **no necesitas un servicio aparte**.
Móntalo dentro de `api` como un intervalo cada 5 minutos y te ahorras el costo.
Sepáralo solo cuando el tablero empiece a ponerse lento.

Tareas del worker:
- Liberar asignaciones vencidas (`vence_en < now()`)
- Recordatorio a las 24 h de asignación sin abrir
- Reintentos de notificaciones fallidas
- Limpieza de `tokens_acceso` expirados y `sesiones` vencidas

---

## 2. Correo — importante

**Railway no ofrece servicio de correo y bloquea SMTP saliente**
(puertos 25, 465, 587, 2525) en los planes Free, Trial y Hobby. Solo está
disponible desde el plan Pro.

Solución: **Resend con API HTTPS**, que funciona en cualquier plan porque es
una llamada HTTP normal.

El volumen es mínimo. Los ciudadanos no tienen cuenta; el correo solo se usa para:
- Enlace de alta de contraseña (cuando el admin crea un usuario)
- Recuperación de contraseña

Son decenas de mensajes al mes. El nivel gratuito de Resend (3.000/mes) sobra.

Las notificaciones al ciudadano van por **SMS/WhatsApp**, no por correo.

---

## 3. Almacenamiento de fotos

Railway Buckets es S3-compatible, con URLs prefirmadas, y cobra por
almacenamiento con operaciones y egreso incluidos.

**Flujo de subida (las fotos nunca pasan por el API):**

```
navegador                       api                      bucket
    │                            │                          │
    ├─ comprime en Web Worker    │                          │
    ├─ POST /fotos/prefirmar ───►│                          │
    │                            ├─ valida rol, cupo (<100) │
    │                            ├─ genera PUT prefirmado ──┤
    │◄─── {url, key, uuid} ──────┤                          │
    ├─ PUT directo al bucket ─────────────────────────────► │
    ├─ POST /fotos/confirmar ───►│                          │
    │                            └─ INSERT en `fotos`       │
```

Ventajas: no consumes CPU ni ancho de banda del API, y el control de acceso
por rol lo sigues teniendo tú porque el API es quien firma las URLs.

**Cálculo de espacio:**

| Reportes | Fotos | Espacio | Costo aprox. |
|---|---|---|---|
| 500 | 50.000 | ~10 GB | ~$0.15/mes |
| 2.000 | 200.000 | ~41 GB | ~$0.62/mes |
| 5.000 | 500.000 | ~103 GB | ~$1.55/mes |

El almacenamiento no es el costo relevante; lo son compute y base de datos.

**Límites a aplicar:** 100 fotos por reporte (hay un trigger en la base),
8 MB por archivo antes de comprimir, 200 fotos/hora por IP.

---

## 4. Variables de entorno

```bash
# Base de datos (Railway la inyecta como referencia de variable)
DATABASE_URL=postgresql://user:pass@host:5432/railway

# Sesiones
SESSION_SECRET=            # 32 bytes aleatorios en hex
SESSION_TTL_HORAS=12
COOKIE_DOMINIO=

# Railway Bucket (referencias de variable del servicio bucket)
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_URL_TTL_SEGUNDOS=900

# Correo
RESEND_API_KEY=
CORREO_REMITENTE=no-responder@tudominio.co
URL_BASE=https://tudominio.co

# SMS / WhatsApp
SMS_PROVEEDOR=
SMS_API_KEY=

# Operación
ASIGNACION_TTL_HORAS=48
ASIGNACION_RECORDATORIO_HORAS=24
MAX_FOTOS_POR_REPORTE=100
MAX_INTENTOS_LOGIN=5
BLOQUEO_MINUTOS=15

NODE_ENV=production
PORT=3000
```

---

## 5. Configuración de Railway

`railway.json` en la raíz de cada servicio:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build":  { "builder": "NIXPACKS" },
  "deploy": {
    "healthcheckPath": "/salud",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Al desplegar Postgres:** usa la imagen `postgis/postgis:16-3.4` con volumen
persistente. Verifica antes de correr las migraciones:

```sql
SELECT postgis_version();
```

Si falla, no continúes: media docena de consultas del sistema dependen de PostGIS.

---

## 6. Seguridad de la sesión

- Cookie `httpOnly`, `Secure`, `SameSite=Lax`. **No JWT en localStorage.**
- ID de sesión opaco de 32 bytes aleatorios; el estado vive en la tabla `sesiones`.
- Argon2id para hashear contraseñas (`argon2` de npm), nunca bcrypt con costo bajo.
- Bloqueo tras 5 intentos fallidos durante 15 minutos.
- Los tokens de alta y recuperación se guardan **hasheados** (sha256).
  El token en claro solo existe dentro del enlace del correo.
- Re-autenticación obligatoria en el momento de firmar un dictamen.
- CSRF: token por sesión en los formularios, o `SameSite=Strict` en las rutas
  que hacen cambios.

---

## 7. Respaldos

El dato irreemplazable son los formularios firmados. Las fotos se pueden
volver a tomar; un dictamen no.

- Copia diaria de Postgres a un bucket separado, retención de 30 días.
- Prueba la restauración **antes** de que la necesites.
- Exportación periódica en CSV para entregar a la entidad coordinadora,
  para que el dato no dependa de que esta plataforma siga viva.

Este último punto importa más de lo que parece: el sistema es temporal,
los datos de la emergencia no.
