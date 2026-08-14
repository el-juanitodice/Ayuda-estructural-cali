# Despliegue en Railway — paso a paso

Tiempo estimado: 30–45 minutos. Necesitas: cuenta en Railway (railway.com),
el repo en GitHub (o Railway CLI), y opcionalmente una cuenta en Resend.

La app entera corre en UN servicio (api sirve el front compilado) + Postgres
+ un bucket. Cabe en el plan Hobby (~US$5/mes).

---

## 0. Antes de desplegar (en tu máquina)

```bash
npm install
npm run build          # compila web/dist (el api lo sirve)
```

Verifica que `npm run build` termine sin errores antes de subir.

## 1. Crear el proyecto

1. railway.com → **New Project** → **Empty Project**.
2. Nómbralo `inspeccion-cali`.

## 2. Postgres CON PostGIS (crítico)

**No uses el template "PostgreSQL" normal: no trae PostGIS.**

1. En el proyecto: **Create → Docker Image** → imagen: `postgis/postgis:16-3.4`.
2. En **Variables** del servicio agrega:
   - `POSTGRES_PASSWORD` = (contraseña fuerte)
   - `POSTGRES_DB` = `cali`
3. En **Settings → Volumes**: monta un volumen en `/var/lib/postgresql/data`.
4. Despliega y espera a que esté verde.
5. Conéctate (pestaña **Data** o `railway connect`) y verifica:
   ```sql
   SELECT postgis_version();
   ```
   **Si falla, no continúes** (ARQUITECTURA §5).
6. Corre en orden:
   ```sql
   \i db/schema.sql
   \i db/migraciones/001_fotos_pendientes.sql
   \i db/migraciones/002_consecutivo.sql
   ```
   (o por consola: `psql $DATABASE_URL -f db/schema.sql` etc.)

   **NO corras `db/seed.sql` en producción.** Crea el admin real:
   ```sql
   INSERT INTO usuarios (email, nombre, rol, telefono)
   VALUES ('tu-correo@ejemplo.co', 'Tu Nombre', 'admin', '3XXXXXXXXX');
   ```
   (La contraseña la defines luego con el enlace de recuperación, paso 6.)

## 3. Bucket de fotos

1. **Create → Bucket** → nómbralo `bucket-fotos`. Déjalo **privado**.
2. Railway te da: endpoint, bucket, access key y secret. Los usarás como
   referencias de variable en el paso 4.

## 4. Servicio api (+ front)

1. **Create → GitHub Repo** → elige este repo. Railway detecta `railway.json`
   (build `npm ci && npm run build`, start `npm run start`, healthcheck `/api/v1/salud`).
2. **Variables** del servicio (usa referencias `${{servicio.VARIABLE}}` donde aplique):

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | referencia al Postgres (`${{Postgres.DATABASE_URL}}`) — ajusta el nombre del servicio |
   | `SESSION_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
   | `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | referencias del bucket |
   | `S3_REGION` | `auto` |
   | `URL_BASE` | el dominio público (paso 5), p. ej. `https://inspeccion-cali.up.railway.app` |
   | `RESEND_API_KEY` | de resend.com (gratis hasta 3.000/mes). Sin ella, los enlaces de alta salen en los logs |
   | `CORREO_REMITENTE` | remitente verificado en Resend |
   | `NODE_ENV` | `production` |

   El resto tiene valores por defecto sensatos (ver `.env.example`).
3. Despliega. El healthcheck pasa solo si Postgres responde **y** PostGIS existe.

## 5. Dominio

**Settings → Networking → Generate Domain** (o dominio propio).
Actualiza `URL_BASE` con ese dominio y redespliega (los enlaces de correo lo usan).

## 6. Primer ingreso

1. Abre `https://tu-dominio/#/ingreso` → "Olvidé mi contraseña" con el correo
   del admin que insertaste. Te llega el enlace (o míralo en los logs si no
   configuraste Resend).
2. Define tu contraseña (mínimo 12 caracteres), entra como admin.
3. En **Admin** crea moderadores e ingenieros (para ingenieros: verifica antes
   la matrícula en copnia.gov.co — el sistema te lo exige).

## 7. Prueba de humo (5 minutos, hazla siempre)

1. `https://tu-dominio/api/v1/salud` → `{"ok":true,"postgis":"3.4..."}`
2. `#/reportar` desde un celular: crea un reporte con foto → radicado CAL-2026-…
3. Escribe "hay personas atrapadas" en la descripción → debe salir la pantalla
   roja del 123 y no dejarte continuar sin reconocerla.
4. Entra como moderador → la cola muestra el reporte → validar → aparece gris
   en `#/` (el mapa).
5. Apaga el wifi del celular, abre la app → debe cargar (service worker).
   Toma una foto en `#/reportar` → queda en cola → prende el wifi → sube sola.

## 8. Respaldos (no lo dejes para después — ARQUITECTURA §7)

- Railway → servicio Postgres → **Backups**: activa el respaldo diario.
- Programa además un `pg_dump` externo semanal y guarda una copia fuera de
  Railway. El dato irreemplazable son los dictámenes firmados.

---

## Problemas comunes

| Síntoma | Causa probable |
|---|---|
| Healthcheck falla al desplegar | `DATABASE_URL` mal referenciada, o el Postgres no es la imagen PostGIS |
| `Faltan variables de entorno: …` en logs | El servicio arranca sin esas variables: agrégalas |
| El correo de alta no llega | Sin `RESEND_API_KEY` el enlace se imprime en los **logs** del servicio |
| Fotos se quedan "pendientes" en el celular | Revisa `S3_*`; el PUT prefirmado falla → mira la consola del navegador |
| El front no carga (404) | No corriste `npm run build` en el deploy: revisa el build log |
