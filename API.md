# API

Base: `/api/v1` · JSON · sesión en cookie `httpOnly`.

Errores: `{ "error": "codigo", "mensaje": "texto para el usuario", "detalles": {} }`

---

## Público (sin autenticación)

### `POST /reportes`
Reporte ciudadano. No requiere cuenta.

```json
{
  "reportante_nombre": "Ana Gómez",
  "reportante_telefono": "3001234567",
  "reportante_relacion": "propietario",
  "direccion": "Carrera 23 # 15-19",
  "barrio": "San Fernando",
  "lat": 3.4212, "lng": -76.5432, "precision_gps_m": 12,
  "tipo_edificacion": "edificio",
  "pisos_declarados": 5,
  "unidades_declaradas": 20,
  "habitada": true,
  "uso_declarado": 1,
  "descripcion": "Grietas en la columna del parqueadero",
  "banderas": { "personasAtrapadas": false, "colapsoEnCurso": false }
}
```

**El servidor evalúa `requiereLlamar123()` sobre `descripcion` y `banderas`.**
Si da verdadero responde `409` con `{ "error": "emergencia_123" }` y el cliente
debe mostrar la pantalla de emergencia. El reporte igual se guarda y se marca
como prioritario.

Respuesta `201`: `{ "uuid", "consecutivo": "CAL-2026-00123" }`

Rate limit: 3 por hora por IP.

### `GET /mapa`
Puntos del mapa público. Sirve la vista `mapa_publico`:
ubicación difuminada a ~100 m, sin datos personales, sin dirección exacta.

```json
{
  "leyenda": {
    "gris": "Reportado por un ciudadano, sin inspección técnica. No indica daño.",
    "colores": "Inspección cerrada y firmada por un ingeniero.",
    "advertencia": "Que no haya punto no significa que una edificación esté en buen estado."
  },
  "puntos": [
    { "uuid": "...", "lat": 3.421, "lng": -76.543, "color": "gris", "con_dictamen": false },
    { "uuid": "...", "lat": 3.437, "lng": -76.522, "color": "amarillo", "con_dictamen": true,
      "dictaminado_en": "2026-08-12T14:03:00Z" }
  ]
}
```

El campo `leyenda` viaja en la respuesta a propósito: el cliente no debe poder
renderizar el mapa sin ella.

### `GET /reportes/:consecutivo/estado`
Consulta del ciudadano con su número de radicado. Devuelve solo estado y fechas.
Sin datos de contacto, sin detalle del dictamen más allá del color.

### `GET /salud`
Health check para Railway. Verifica conexión a Postgres y que PostGIS responda.

---

## Autenticación

### `POST /auth/definir-clave`
`{ "token": "...", "clave": "..." }` — token de un solo uso, 24 h.
Mínimo 12 caracteres. Invalida el token al usarlo.

### `POST /auth/login`
`{ "email", "clave" }` → cookie de sesión. Bloqueo tras 5 intentos por 15 min.

### `POST /auth/reautenticar`
`{ "clave" }` — obligatorio antes de firmar. Devuelve un `ticket_firma`
válido 5 minutos y de un solo uso.

### `POST /auth/logout` · `GET /auth/yo`

---

## Moderador

### `GET /moderacion/cola`
Reportes en estado `nuevo`, ordenados por señales objetivas
(reportes independientes del predio, unidades, uso, antigüedad).
**Nunca por juicio de gravedad del moderador.**

Incluye teléfono → registra `ver_telefono` en `auditoria`.

### `POST /moderacion/:uuid/validar`
```json
{ "notas_llamada": "Confirmado con la propietaria. Edificio de 5 pisos, 20 apartamentos.",
  "correcciones": { "pisos_declarados": 5, "direccion": "..." } }
```
Pasa a `validado` → **aparece como punto gris en el mapa público**.
Ejecuta `motivosEscalacionA()`; si devuelve motivos, marca `requiere_nivel_a`.

### `POST /moderacion/:uuid/descartar`
`{ "motivo": "duplicado" | "no_contesta" | "fuera_de_zona" | "spam" | "otro" }`

### `POST /moderacion/:uuid/asignar`
`{ "ingeniero_id": 42 }`

Rechaza con `422` si el reporte tiene `requiere_nivel_a` y el ingeniero es nivel B.
Crea la asignación con `vence_en = now() + ASIGNACION_TTL_HORAS`.

### `GET /moderacion/ingenieros`
Lista con nivel, carga actual y zona. Para decidir a quién asignar.

### `POST /moderacion/ingenieros/:id/verificar-matricula`
`{ "matricula", "profesion", "evidencia_url", "nivel": "ingeniero_a" | "ingeniero_b" }`

---

## Fotos

### `POST /fotos/prefirmar`
```json
{ "reporte_uuid": "...", "uuid": "<uuid del cliente>",
  "categoria": "grietas_detalle", "piso": "3",
  "bytes_full": 184320, "bytes_thumb": 24100 }
```
Valida rol, cupo (< 100) y categoría. Devuelve dos PUT prefirmados (15 min):
`{ "put_full", "put_thumb", "key_full", "key_thumb" }`

### `POST /fotos/confirmar`
`{ "uuid", "ancho", "alto", "exif": { "lat", "lng", "tomada_en" } }`

**Idempotente por `uuid`.** Un reintento no duplica.

### `GET /fotos/:uuid`
Devuelve URL prefirmada de lectura según el rol.
El moderador solo accede a las 3 categorías obligatorias.

---

## Ingeniero

### `GET /campo/mis-asignaciones`
Incluye todo lo necesario para trabajar **sin conexión**: datos del reporte,
catálogos AIS, fotos del ciudadano. El cliente lo guarda en IndexedDB.

### `POST /campo/formularios` (upsert por `uuid`)
Ingesta del formulario AIS. **Idempotente**: un reintento de la cola offline
no crea duplicados.

El servidor:
1. Valida la matriz de daños con `validarMatrizDanos()` → `422` si alguna fila ≠ 100
2. Recalcula `habitabilidadSugerida()` — **no confía en el valor del cliente**
3. Si `estado = 'capturado'` (ingeniero B): guarda sin habitabilidad
4. Si `estado = 'firmado'`: exige `ticket_firma` válido y rol `ingeniero_a`

### `POST /campo/formularios/:uuid/firmar`
```json
{ "ticket_firma": "...",
  "riesgos": { "estabilidad": "bajo", "geotecnico": "bajo",
               "estructural": "alto", "no_estructural": "bajo_medidas" },
  "habitabilidad_final": "naranja",
  "motivo_discrepancia": null,
  "visita_presencial": true,
  "firma_imagen": "data:image/png;base64,..." }
```

Si `habitabilidad_final !== habitabilidadSugerida(riesgos)` y falta
`motivo_discrepancia` → `422`. El servidor **no corrige** el color:
exige justificación y guarda ambos valores.

Al firmar: reporte pasa a `cerrado` → **el punto se vuelve de color en el mapa**.

### `GET /campo/formularios/:uuid/aviso.pdf`
Aviso imprimible tamaño carta para pegar en cada entrada:
color grande, dirección, número de formulario, fecha, nombre y matrícula
del ingeniero A, QR a la ficha pública, y qué significa el color.

### `GET /campo/formularios/:uuid/formulario.pdf`
Réplica del Formulario Único AIS para el expediente oficial.

---

## Coordinador

### `GET /tablero/cobertura`
Evaluadas vs. pendientes por comuna, y distribución por color.

### `GET /tablero/discrepancias`
Formularios donde el color firmado difiere del sugerido. Cola de revisión.

### `GET /tablero/vencimientos`
Asignaciones por vencer y ya vencidas.

### `POST /tablero/:uuid/escalar`
Escalación manual a nivel A. **Nunca se puede desescalar.**

### `GET /tablero/exportar?formato=csv&desde=&hasta=`
Registra `exportar` en `auditoria`.

---

## Admin

### `POST /admin/usuarios`
`{ "email", "nombre", "rol", "telefono" }`

Crea la cuenta **sin contraseña** y envía enlace de alta (24 h) vía Resend.
El admin nunca define ni ve la contraseña.

### `PATCH /admin/usuarios/:id` · `POST /admin/usuarios/:id/desactivar`
### `GET /admin/auditoria?usuario_id=&accion=&desde=`

---

## Notas transversales

- Toda respuesta que incluya un teléfono escribe en `auditoria`.
- Toda transición de estado escribe en `reportes_historial`.
- Los endpoints de campo aceptan `If-Match` con versión para detectar
  escrituras concurrentes desde dos dispositivos.
- Un formulario `firmado` es **inmutable**. Una corrección crea una revisión
  vinculada al original, no lo modifica.
