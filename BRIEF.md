# BRIEF DE CONSTRUCCIÓN — Plataforma de inspección post-sísmica de Cali

> **Lee este archivo completo antes de escribir código.**
> Contiene restricciones que no son negociables y que no son evidentes desde el código.

---

## 0. Contexto

El 10 de agosto de 2026 un sismo de magnitud 7,4 con epicentro en San José del Palmar
(Chocó) afectó gravemente a Cali, Quibdó, Pereira, Manizales y Buenaventura.

Ingenieros civiles y arquitectos están recorriendo Cali a pie evaluando edificaciones.
Hoy lo hacen con formularios de papel. Este sistema los apoya.

**El cliente real de este software son los ingenieros en la calle y sus coordinadores.**
No es una app de noticias, no es una red social, no es una startup.

---

## 1. Qué es y qué NO es este sistema

### Es
- Una herramienta de **captura** del Formulario Único AIS (Asociación Colombiana de
  Ingeniería Sísmica) en campo, que funciona sin conexión.
- Un canal para que ciudadanos **soliciten** la inspección de su edificación.
- Un **tablero de coordinación** para asignar ingenieros y ver cobertura por comuna.

### NO es
- ❌ **El sistema no evalúa edificaciones.** No calcula habitabilidad por su cuenta,
  no usa IA para decidir si un edificio es seguro, no infiere daño de fotos.
- ❌ No reemplaza al 123 ni a los organismos oficiales de emergencia.
- ❌ No emite dictámenes sin la firma de un ingeniero con matrícula verificada.

> Si en algún momento el diseño te lleva a que el software "decida" habitabilidad,
> te desviaste. La única función automática permitida sobre habitabilidad es
> **verificar la coherencia aritmética** de lo que el ingeniero ya decidió.

---

## 2. Reglas críticas (violarlas hace daño real)

### 2.1 El dictamen es humano
El ingeniero nivel A asigna los cuatro niveles de riesgo y elige el color.
El sistema calcula qué color *correspondería* según la regla AIS y **avisa** si hay
discrepancia. Nunca sobreescribe, nunca bloquea. Si el ingeniero confirma, se guarda
su elección junto con la sugerida y el motivo de la discrepancia.

### 2.2 El mapa público puede matar o salvar
- Punto **gris** = reportado por un ciudadano, sin inspección técnica.
- Punto de **color** = dictamen firmado.
- La leyenda debe decir, siempre visible y sin poder colapsarse:
  *"Que no haya punto no significa que una edificación esté en buen estado."*
- La ubicación pública se difumina a ~100 m (`ST_SnapToGrid`). Un mapa con direcciones
  exactas de casas dañadas y desocupadas es una lista para saqueo.

### 2.3 Corte de emergencia
Si el reporte ciudadano menciona personas atrapadas, colapso en curso, gas o incendio,
la interfaz **interrumpe** y muestra "Llama al 123" antes de dejar continuar.
Ver `requiereLlamar123()` en `shared/ais.js`.

### 2.4 Datos personales (Ley 1581 de 2012)
- Los teléfonos viven en el registro pero **solo los ven** moderador, coordinador y admin.
- Toda lectura de teléfono se registra en la tabla `auditoria`.
- El ingeniero B no ve datos de contacto. No los necesita.

### 2.5 Nadie se auto-registra
Solo el admin global crea cuentas. Los ingenieros requieren matrícula COPNIA
verificada manualmente (hay un `CHECK` en la base que lo obliga).
El admin **no define la contraseña**: el sistema envía un enlace de un solo uso
(24 h) para que la persona la establezca.

### 2.6 Firmar exige contraseña de nuevo
Aunque la sesión esté activa. Es un dictamen con matrícula profesional.

---

## 3. Roles

| Rol | Hace | Ve teléfonos |
|---|---|---|
| `ciudadano` | Reporta (sin cuenta), sube hasta 100 fotos | — |
| `moderador` | Llama y valida, asigna ingeniero, verifica matrículas | Sí (auditado) |
| `ingeniero_b` | **Captura de campo.** Llena el formulario AIS. **No dictamina** | No |
| `ingeniero_a` | Asigna los 4 riesgos, define habitabilidad, **firma** | Del predio |
| `coordinador` | Prioriza cola, tablero, exporta | Sí (auditado) |
| `admin` | Crea usuarios, configuración | Sí (auditado) |

**La distinción A/B es legal, no cosmética.** B no emite "dictamen preliminar":
B captura evidencia y observaciones. A revisa y firma. En muchos casos A puede
cerrar remotamente sobre la captura de B sin desplazarse — ahí está la ganancia
de capacidad. Si A no visitó, queda registrado explícitamente en el formulario.

---

## 4. Restricciones técnicas duras

### 4.1 Offline no es una funcionalidad, es la arquitectura
El ingeniero está a pie, sin antenas, dentro de edificios de concreto.

- Local-first con IndexedDB (usa **Dexie**).
- Autoguardado en **cada cambio de campo**, no al enviar.
- UUID generado en el cliente. Nunca dependas del servidor para tener ID.
- Service Worker con precache completo del app shell. Debe abrir en modo avión.
- Cola de sincronización persistente con reintento y backoff.
- Indicador visible de cuántos formularios están pendientes de subir.

Si tienes que sacrificar algo, sacrifica funciones. **El offline no se negocia.**

### 4.2 El servidor NO procesa imágenes
Hasta 100 fotos por reporte. Cualquier redimensionado en el backend se va a timeout.

- Compresión en el navegador con `OffscreenCanvas` **dentro de un Web Worker**.
- Dos versiones: `thumb` (400 px, q0.65, ~25 KB) y `full` (1920 px, q0.72, ~180 KB).
- **No se guarda el original.** A 1920 px una grieta de 3 mm es perfectamente visible.
- Fallback a `<canvas>` + `toBlob` y JPEG si no hay soporte de WebP/OffscreenCanvas.
- Subida secuencial, máximo 2 concurrentes, cola persistente, idempotente por UUID.
- El reporte se envía **sin esperar las fotos** (el JSON pesa 2 KB y es lo urgente
  para que el moderador pueda llamar).

### 4.3 La regla de habitabilidad vive en UN solo archivo
`shared/ais.js` se importa **sin modificar** en cliente y servidor.
El cliente la usa offline para advertir; el servidor la recalcula al recibir y
**nunca confía en el valor que mandó el cliente**.

Si duplicas esa lógica en dos lugares, pueden divergir, y una divergencia ahí
significa un edificio con el color equivocado.

---

## 5. Stack acordado

| Capa | Elección | Por qué |
|---|---|---|
| Runtime | Node 22 + **Fastify** | Validación por JSON Schema integrada |
| Base | **PostgreSQL 16 + PostGIS** | Consultas por radio constantes |
| Front | **Vite + Preact + Dexie** | Bundle pequeño; la gente está en 3G saturado |
| Fotos | **Railway Buckets** (S3-compatible) | Prefirmadas, egreso gratis |
| Correo | **Resend** (API HTTPS) | Railway bloquea SMTP saliente fuera de Pro |
| Despliegue | **Railway** | Todo el stack |

**No cambies de stack sin razón fuerte.** Especialmente: no reemplaces Postgres por
MySQL (pierdes PostGIS) ni Preact por React (triplicas el bundle).

---

## 6. Archivos que ya existen y NO debes reescribir desde cero

| Archivo | Qué es |
|---|---|
| `db/schema.sql` | Esquema completo, probado. Extiéndelo con migraciones |
| `shared/ais.js` | Catálogos AIS y reglas. Probado con casos frontera |

Los casos frontera de la regla de habitabilidad ya están verificados, incluido el
delicado: **exactamente dos riesgos "alto" → naranja**, pero **más de dos → rojo**.

---

## 7. Orden de construcción

Ordenado por riesgo técnico, no por facilidad. Lo más probable que falle va primero.

1. **Worker de compresión de fotos** + cola de subida a Railway Bucket
   *(riesgo: celulares viejos, memoria, soporte de OffscreenCanvas)*
2. **Auth**: alta de contraseña por enlace de un solo uso, sesión en cookie
   httpOnly, Argon2id, bloqueo tras 5 intentos, re-auth al firmar
3. **Formulario ciudadano** + corte de emergencia 123
4. **Panel de moderador**: cola, registro de llamada, validar/descartar, asignar
5. **Mapa público** gris/color con la leyenda obligatoria
6. **Formulario AIS offline** para captura (ingeniero B)
7. **Revisión y firma** (ingeniero A) + verificación de coherencia
8. **Aviso imprimible de habitabilidad** + PDF del formulario
9. Reglas de escalación automática
10. Tablero del coordinador y exportación CSV

**Los puntos 1–5 ya son un sistema utilizable.** Prioriza terminarlos bien
sobre avanzar a los siguientes.

---

## 8. El eslabón que casi todos olvidan

El procedimiento AIS exige colocar un **aviso físico de color en cada entrada** de la
edificación y explicárselo verbalmente a los ocupantes.

El sistema debe generar ese aviso imprimible en tamaño carta con: color grande,
dirección, número de formulario, fecha, nombre y matrícula del ingeniero A,
QR a la ficha pública, y el texto de qué significa el color.

Sin eso tienes una base de datos bonita y un ocupante que no sabe si puede entrar
a su casa.

---

## 9. Cuando tengas dudas

- Ante la duda entre "más funciones" y "funciona sin señal": **funciona sin señal**.
- Ante la duda entre automatizar un juicio técnico y pedírselo al ingeniero:
  **pídeselo al ingeniero**.
- Ante la duda entre mostrar más información pública y proteger a los ocupantes:
  **protege a los ocupantes**.
- Ante la duda sobre un campo del formulario AIS: respeta el formulario oficial.
  No inventes campos ni quites los que están.

Referencia del formulario y los criterios:
*Manual de Campo para la Inspección de Edificaciones Después de un Sismo*, AIS, 2003.
