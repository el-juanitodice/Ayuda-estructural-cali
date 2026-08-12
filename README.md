# Inspección Post-Sísmica — Cali

Herramienta de apoyo para los ingenieros y arquitectos que evalúan edificaciones
en Cali tras el sismo del 10 de agosto de 2026.

Digitaliza el **Formulario Único de Inspección de Edificaciones Después de un Sismo**
de la Asociación Colombiana de Ingeniería Sísmica (AIS), funciona sin conexión,
y conecta las solicitudes ciudadanas con los profesionales que hacen la evaluación.

> ⚠️ **Este sistema no evalúa edificaciones.** Captura, valida coherencia y coordina.
> Todo dictamen lo emite y firma un ingeniero con matrícula profesional verificada.
>
> 🚨 **Emergencia con riesgo inmediato para la vida: llame al 123.**

---

## Documentación

| Archivo | Contenido |
|---|---|
| **[BRIEF.md](BRIEF.md)** | **Empieza aquí.** Restricciones críticas y orden de construcción |
| [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) | Despliegue en Railway, servicios, variables |
| [docs/API.md](docs/API.md) | Endpoints |
| [docs/FLUJOS.md](docs/FLUJOS.md) | Estados del reporte y recorridos por rol |
| [db/schema.sql](db/schema.sql) | Esquema PostgreSQL + PostGIS |
| [shared/ais.js](shared/ais.js) | Catálogos y reglas AIS (cliente + servidor) |

---

## Estructura

```
.
├── BRIEF.md                 ← léelo antes de escribir código
├── db/
│   ├── schema.sql
│   └── seed.sql
├── shared/
│   └── ais.js               ← importado sin modificar por api/ y web/
├── api/                     ← Fastify (por construir)
├── web/                     ← Vite + Preact (por construir)
└── docs/
```

---

## Desarrollo local

```bash
# Base de datos
docker run -d --name pg-cali -p 5432:5432 \
  -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=cali \
  postgis/postgis:16-3.4

psql postgresql://postgres:dev@localhost:5432/cali -f db/schema.sql
psql postgresql://postgres:dev@localhost:5432/cali -f db/seed.sql

cp .env.example .env
npm install
npm run dev
```

---

## Roles

| Rol | Función |
|---|---|
| Ciudadano | Solicita inspección (sin cuenta), sube fotos |
| Moderador | Valida por teléfono, asigna ingeniero, verifica matrículas |
| Ingeniero B | Captura de campo. **No dictamina** |
| Ingeniero A | Asigna riesgos, define habitabilidad, **firma** |
| Coordinador | Prioriza, tablero, exporta |
| Admin | Crea usuarios |

Solo el admin crea cuentas. No hay registro abierto.

---

## Clasificación de habitabilidad (AIS)

Determinada por los cuatro niveles de riesgo que asigna el ingeniero A:

| Riesgos | Resultado |
|---|---|
| Los cuatro en bajo | 🟢 Habitable |
| Al menos uno en bajo después de medidas | 🟡 Uso restringido |
| Al menos uno en alto | 🟠 No habitable |
| Al menos uno en muy alto, o más de dos en alto | 🔴 Peligro de colapso |

El sistema calcula el resultado y **avisa** si el ingeniero eligió otro,
pidiendo justificación. Nunca lo sobreescribe.

---

## Licencia

Software de interés público. Uso libre por entidades de gestión del riesgo,
alcaldías, gremios profesionales y organizaciones de respuesta a emergencias.
