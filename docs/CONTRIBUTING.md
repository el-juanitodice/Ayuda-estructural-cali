# Cómo contribuir

Gracias por querer ayudar. Este proyecto apoya la respuesta al sismo del 10 de
agosto de 2026 en Cali: **la prioridad es que funcione en la calle**, no la
elegancia del código.

## Antes de escribir código

1. Lee **[BRIEF.md](BRIEF.md)** completo. Contiene reglas que no son negociables
   y que no se deducen del código.
2. Las tres que más rompen los recién llegados:
   - **El sistema nunca decide habitabilidad.** Nada de IA ni automatismos sobre
     el dictamen: eso firma un ingeniero. La única automatización permitida es
     verificar la coherencia aritmética de lo que el ingeniero ya decidió.
   - **`shared/ais.js` no se duplica ni se modifica a la ligera.** Es la regla
     normativa, importada por cliente y servidor. Divergencia = edificio con el
     color equivocado.
   - **Offline no se negocia.** El ingeniero está dentro de edificios de
     concreto sin señal. Ante la duda entre una función nueva y que funcione
     sin señal: funciona sin señal.

## Puesta en marcha

Ver «Desarrollo local» en el [README](README.md). En resumen: Docker con
`postgis/postgis:16-3.4`, `cp .env.example .env`, `npm install`, `npm run dev`.
El esquema se aplica solo al arrancar.

## En qué se necesita ayuda (orden de urgencia)

1. **Proveedor de SMS/WhatsApp** — `api/src/sms.js` es un stub que solo escribe
   al log. Falta integrar un proveedor real (Twilio, Labsmobile o similar) para
   notificar al ciudadano cuando su dictamen se firma. Es el cierre del ciclo.
2. **Pruebas** — `npm test` está configurado (`node --test`) pero faltan casos:
   la prioridad son `shared/ais.js` (más casos frontera), las transiciones de
   estado en `api/src/rutas/*` y la idempotencia de la cola de fotos.
3. **PDF del Formulario Único AIS** — hoy el aviso se imprime desde el navegador.
   Falta generar el formulario oficial completo como PDF de expediente.
4. **Recordatorio de 24 h** — el worker libera asignaciones vencidas (48 h),
   pero el recordatorio a las 24 h sin abrir aún no se envía (depende del punto 1).
5. **Accesibilidad y pruebas en celulares viejos** — el fallback de compresión
   (canvas + JPEG) necesita pruebas reales en Android antiguos.
6. **Revisión de seguridad** — segundo par de ojos sobre auth, rate limits y
   las URLs prefirmadas del bucket.

## Flujo de trabajo

- Rama desde `main`, PR pequeño y enfocado. `main` despliega **automáticamente**
  a producción vía Railway: no se fusiona nada que no esté probado.
- Antes del PR: `npm run build` debe pasar y `node --check` sobre lo tocado.
- La base se cambia con **migraciones nuevas** en `db/migraciones/`
  (idempotentes: `IF NOT EXISTS` / `OR REPLACE`). `db/schema.sql` no se
  reescribe.
- Español en código, comentarios y UI: es el idioma de quienes lo operan.
- Sin dependencias nuevas salvo necesidad real — la gente carga la app en 3G.

## Contribuir sin programar

- **Ingenieros/arquitectos con matrícula COPNIA:** escriban al administrador de
  la plataforma para crear su cuenta (no hay auto-registro, es deliberado).
- **Difusión:** el [manual PDF](MANUAL-AyudaEstructuralCali.pdf) es de libre
  circulación — compártelo completo y sin modificaciones.
- **Moderación:** se necesitan personas que llamen y validen reportes.

## Datos sensibles

Trabajamos con datos personales de personas damnificadas (Ley 1581 de 2012).
Nunca subas al repo volcados de la base, teléfonos ni capturas con datos
reales. `.env` jamás se commitea.
