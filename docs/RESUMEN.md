# Resumen ejecutivo

**Ayuda Estructural Cali** — Plataforma de inspección post-sísmica de edificaciones
**https://www.ayudaestructuralcali.org**

---

## El problema

El 10 de agosto de 2026, un sismo de magnitud 7,4 con epicentro en San José del
Palmar (Chocó) golpeó a Cali, Quibdó, Pereira, Manizales, Armenia, Popayán y
Buenaventura. Se declaró desastre nacional.

Tras un sismo, miles de edificaciones necesitan una inspección técnica que
determine si se pueden habitar. En Colombia esa evaluación se hace con el
**Formulario Único de la Asociación Colombiana de Ingeniería Sísmica (AIS)**,
tradicionalmente **en papel**. El papel genera tres cuellos de botella:

- Los ingenieros voluntarios no saben a dónde ir primero.
- Los formularios tardan días en digitalizarse, si es que se digitalizan.
- La familia que espera no sabe si puede volver a dormir en su casa.

## La solución

Una plataforma web gratuita, **sin instalación** y que **funciona sin señal**,
con tres puertas de entrada:

| Quién | Qué hace |
|---|---|
| **Ciudadanía** | Reporta daños desde el celular en 2 minutos, sin crear cuenta. Recibe un radicado y consulta su estado. |
| **Ingenieros voluntarios** | Capturan el Formulario AIS completo en campo, incluso sin conexión, con fotos comprimidas en el mismo teléfono. |
| **Coordinación** | Valida reportes por teléfono, prioriza con criterios objetivos, asigna ingenieros y ve la cobertura por comuna. |

## Principios de diseño

1. **El software no decide.** No hay IA ni automatismo que declare habitable un
   edificio. La única función automática es verificar la coherencia aritmética
   de lo que el ingeniero ya decidió, y avisarle si hay discrepancia.
2. **Offline es la arquitectura, no una función.** El ingeniero trabaja dentro
   de edificios de concreto sin antena; el ciudadano reporta con la red
   saturada. Todo se guarda en el dispositivo y se sincroniza solo.
3. **Dos niveles de ingeniero.** El nivel B captura evidencia en campo; el
   nivel A revisa y firma con su matrícula. Multiplica la capacidad sin diluir
   la responsabilidad profesional.
4. **El mapa público puede matar o salvar.** Ubicaciones difuminadas a ~100 m
   (una lista de casas dañadas y vacías es una lista para saqueo) y leyenda
   permanente: *que no haya punto no significa que una edificación esté bien*.
5. **El eslabón físico.** El sistema imprime el aviso de color que se pega en
   cada entrada. Sin él habría una base de datos bonita y un ocupante que no
   sabe si puede entrar a su casa.

## Estado

Sistema **completo y en producción**. Los 10 módulos del plan de construcción
están desplegados: compresión y cola de fotos, autenticación con firma
re-autenticada, reporte ciudadano con corte de emergencia al 123, panel de
moderación, mapa público, formulario AIS offline, dictamen y firma, aviso
imprimible con QR, escalación automática y tablero con exportación CSV.

## Costo de operación

Aproximadamente **US$5 a 10 al mes** (Railway: aplicación + PostgreSQL/PostGIS +
almacenamiento de fotos; correo transaccional en nivel gratuito). El
almacenamiento de 500 000 fotos cuesta cerca de US$1,5 al mes. El proyecto es
voluntario y no tiene ánimo de lucro.

## Tecnología

Node 22 + Fastify · PostgreSQL 16 + PostGIS · Vite + Preact + Dexie (IndexedDB)
· Web Workers para compresión de imágenes · almacenamiento S3-compatible con
URLs prefirmadas · Argon2id y sesiones opacas · desplegado en Railway.

## Cómo ayudar

- **Programadores:** ver [CONTRIBUTING.md](CONTRIBUTING.md) — hay tareas
  concretas priorizadas.
- **Ingenieros y arquitectos con matrícula COPNIA:** solicitar cuenta al
  administrador de la plataforma (no hay registro abierto: es deliberado).
- **Moderadores voluntarios:** se necesita gente que llame y valide reportes.
- **Difusión:** el [manual de uso](MANUAL-AyudaEstructuralCali.pdf) es de libre
  circulación.

## Salvedades

Esta plataforma **no reemplaza a los organismos oficiales de emergencia**. Las
emergencias con riesgo inmediato para la vida se atienden por la **línea 123**.
Las decisiones administrativas —evacuaciones, demoliciones, ayudas— corresponden
a la autoridad local; esta herramienta aporta información técnica trazable y
firmada para sustentarlas.

---

Contacto: Juan David Montoya · Cali, Colombia
Licencia: MIT (ver [LICENSE](LICENSE))
