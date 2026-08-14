# Flujos y estados

## 1. Ciclo de vida del reporte

```
   [ciudadano envía]
            │
            ▼
      ┌───────────┐
      │  nuevo    │   invisible en todos los mapas
      └─────┬─────┘
            │  moderador llama por teléfono
     ┌──────┴───────┐
     ▼              ▼
┌──────────┐  ┌────────────┐
│descartado│  │  validado  │   ⚪ punto GRIS en el mapa público
└──────────┘  └─────┬──────┘
                    │  moderador asigna ingeniero
                    ▼
              ┌──────────┐
              │ asignado │   vence_en = now() + 48 h
              └─────┬────┘
                    │
        ┌───────────┴────────────┐
        ▼ (ingeniero B)          ▼ (directo a A, por escalación)
  ┌─────────────┐          ┌─────────────┐
  │ en_captura  │          │ en_captura  │
  └──────┬──────┘          └──────┬──────┘
         │ B cierra captura       │
         ▼                        │
  ┌──────────────┐                │
  │ en_revision_a│                │
  └──────┬───────┘                │
         └────────┬───────────────┘
                  ▼  A firma (requiere re-autenticación)
            ┌──────────┐
            │  cerrado │   🟢🟡🟠🔴 color en el mapa público
            └──────────┘
```

Estados auxiliares:
- `vencido` — la asignación expiró sin abrirse; vuelve a la bolsa
- `requiere_especialista` — necesita geotecnista o estructural; sale de la cola normal

Toda transición escribe en `reportes_historial`: quién, cuándo, desde dónde.

---

## 2. Visibilidad en el mapa público

| Estado | Mapa |
|---|---|
| `nuevo`, `descartado` | No aparece |
| `validado` … `en_revision_a` | ⚪ Gris |
| `cerrado` | 🟢🟡🟠🔴 según habitabilidad |

**Leyenda obligatoria, siempre visible, no colapsable:**

> ⚪ Gris = reportado por un ciudadano, **sin inspección técnica**. No indica daño.
> 🟢🟡🟠🔴 = inspección cerrada y firmada por un ingeniero.
>
> ⚠️ **Que no haya punto no significa que una edificación esté en buen estado.**
> Solo significa que nadie la ha reportado.

Sin esa última línea el mapa se lee al revés de lo que es.

Ubicación pública difuminada a ~100 m con `ST_SnapToGrid`.
La coordenada exacta solo la ven moderador, ingenieros y coordinador.

---

## 3. Escalación automática a nivel A

Se evalúa al validar, con `motivosEscalacionA()`.
**No es criterio del moderador.** Si dispara alguna, no puede ir a un ingeniero B.

| Condición | Motivo |
|---|---|
| Uso: salud, educacional, institucional, hotelero | `uso_indispensable` |
| Más de 3 pisos | `mas_de_3_pisos` |
| El reporte menciona colapso | `menciona_colapso` |
| El reporte menciona inclinación | `menciona_inclinacion` |
| Indicio geotécnico (grietas en suelo, deslizamiento, hundimiento) | `indicio_geotecnico` |
| Tapia, adobe, bahareque o mampostería no reforzada | `sistema_vulnerable` |
| 3 o más reportes independientes del mismo predio | `multiples_reportes` |
| Dictamen previo naranja o rojo | `reinspeccion_tras_dictamen_critico` |

El coordinador puede escalar manualmente además de estas reglas.
**Nunca puede desescalar.**

---

## 4. Corte de emergencia

En el formulario ciudadano, antes de permitir continuar:

```
🚨 Esto es una emergencia con riesgo inmediato para la vida.

   LLAMA AL 123 AHORA

   Esta plataforma no atiende emergencias.
   [ Llamar al 123 ]   [ Ya llamé, continuar reporte ]
```

Se dispara con `requiereLlamar123()`: banderas explícitas del formulario
(personas atrapadas, colapso en curso) o patrones en la descripción
(atrapado, sepultado, bajo escombros, incendio, olor a gas, herido…).

La pantalla no se puede saltar. El reporte se guarda igual y queda priorizado.

---

## 5. Prioridad de la cola

**Nunca por juicio de gravedad de una persona.** Señales objetivas:

| Señal | Peso |
|---|---|
| Reportes independientes del mismo predio | Alto |
| Uso indispensable (salud, educación) | Alto |
| Número de unidades residenciales | Medio |
| Edificación habitada | Medio |
| Antigüedad de la solicitud | Medio |
| Pisos | Bajo |

El coordinador ajusta el orden final. El moderador no.

---

## 6. Asignaciones y vencimiento

- Al asignar: `vence_en = now() + 48 h` (configurable)
- A las 24 h sin abrir: recordatorio al ingeniero
- A las 48 h sin cerrar: se libera automáticamente y el reporte vuelve a la bolsa
- Un reporte solo puede tener **una asignación viva por rol**
  (índice único parcial en la base)

Sin vencimiento, un ingeniero reclama 15 puntos, visita 3, y los 12 restantes
quedan congelados sin que nadie lo note.

---

## 7. Captura (B) → Dictamen (A)

### Ingeniero B — captura de campo
Llena el formulario AIS: identificación, estructura, matriz de daños,
condiciones preexistentes, fotos, mediciones, esquema.

**No asigna niveles de riesgo. No elige color. No firma.**

Al cerrar: `estado = 'capturado'`, el reporte pasa a `en_revision_a`.

### Ingeniero A — dictamen
Revisa la captura y las fotos. Asigna los cuatro riesgos. El sistema calcula
la habitabilidad sugerida y la muestra:

> Según los riesgos que marcaste corresponde **USO RESTRINGIDO (amarillo)**.

Si A elige otro color, se le pide justificación obligatoria. Se guardan
`habitabilidad_sugerida`, `habitabilidad_final` y `motivo_discrepancia`.

Firmar exige re-autenticación con contraseña.

### Trazabilidad en el documento final

```
Captura de campo:  Ing. [nombre B], matrícula [x], visita presencial [fecha]
Dictamen:          Ing. [nombre A], matrícula [y], firmado [fecha]
Modalidad:         [visita presencial de A] | [revisión remota sobre captura de B]
```

Si A cerró sin visitar, queda explícito. No es una debilidad del sistema:
es información que el ocupante tiene derecho a conocer, y protege al ingeniero.

---

## 8. Cierre del ciclo hacia el ciudadano

Muchos sistemas de este tipo olvidan la vuelta. Al cerrarse el dictamen:

1. **SMS/WhatsApp** al reportante con el color y el enlace a su ficha
2. **Aviso físico imprimible** que el ingeniero pega en cada entrada
3. **Explicación verbal** a los ocupantes — está en el procedimiento AIS,
   la app debe recordárselo al ingeniero antes de cerrar

El paso 2 es el eslabón entre el dato digital y la calle. Sin él tienes una
base de datos y un ocupante que no sabe si puede entrar a su casa.
