/**
 * Reglas del Formulario Único AIS.
 *
 * IMPORTANTE: este archivo se importa SIN MODIFICAR tanto en el navegador
 * como en el servidor. La regla de habitabilidad es normativa; si existiera
 * en dos implementaciones podrían divergir, y una divergencia aquí significa
 * que un edificio queda con el color equivocado.
 *
 * El cliente la usa offline para advertirle al ingeniero de una discrepancia.
 * El servidor la recalcula al recibir, y nunca confía en el valor del cliente.
 */

// ---------------------------------------------------------------------
// Catálogos AIS
// ---------------------------------------------------------------------

export const NIVELES_RIESGO = ['bajo', 'bajo_medidas', 'alto', 'muy_alto'];
export const HABITABILIDAD = ['verde', 'amarillo', 'naranja', 'rojo'];

export const ETIQUETA_HABITABILIDAD = {
  verde:    'Habitable',
  amarillo: 'Uso restringido',
  naranja:  'No habitable',
  rojo:     'Peligro de colapso',
};

export const USOS = {
  1: 'Residencial',   2: 'Comercial',       3: 'Educacional',
  4: 'Salud',         5: 'Hotelero',        6: 'Oficinas',
  7: 'Industrial',    8: 'Institucional',   9: 'Bodegas',
  10: 'Estacionamientos', 11: 'Otros',
};

export const SISTEMAS_ESTRUCTURALES = {
  11: 'Concreto — Pórtico',
  12: 'Concreto — Muros estructurales',
  13: 'Concreto — Sistemas duales',
  14: 'Concreto — Prefabricado',
  21: 'Mampostería confinada',
  22: 'Mampostería reforzada',
  23: 'Mampostería no reforzada',
  31: 'Acero — Pórticos arriostrados',
  32: 'Acero — Pórticos no arriostrados',
  33: 'Acero — Pórticos en celosía',
  41: 'Madera — Pórticos y paneles en madera',
  42: 'Madera — Pórticos en madera, paneles otros materiales',
  51: 'Muros en bahareque',
  52: 'Muros en tapia',
  50: 'Mixta',
  60: 'Otros',
};

/**
 * Qué elementos estructurales se evalúan según el sistema.
 * El formulario debe adaptarse: a un muro de tapia no se le piden "nudos".
 */
export function elementosEstructurales(sistema) {
  const s = Number(sistema);
  if ([11, 13, 14].includes(s)) return ['vigas', 'columnas', 'nudos', 'entrepisos'];
  if (s === 12)                 return ['vigas', 'muros_portantes', 'nudos', 'entrepisos'];
  if ([31, 32, 33].includes(s)) return ['vigas', 'columnas', 'conexiones', 'entrepisos'];
  if ([41, 42].includes(s))     return ['vigas', 'columnas', 'conexiones', 'entrepisos'];
  if ([21, 22, 23].includes(s)) return ['muros_portantes', 'entrepisos'];
  if ([51, 52].includes(s))     return ['muros_portantes', 'entrepisos'];
  return ['vigas', 'columnas', 'nudos', 'entrepisos'];   // mixta / otros
}

export const ELEMENTOS_NO_ESTRUCTURALES = [
  'muros_fachada', 'muros_divisorios', 'cielos_rasos', 'cubierta',
  'escaleras', 'tanques_elevados', 'instalaciones_gas',
  'instalaciones_electricas', 'acueducto_alcantarillado', 'derrame_quimicos',
];

// ---------------------------------------------------------------------
// LA REGLA: habitabilidad a partir de los cuatro niveles de riesgo
// ---------------------------------------------------------------------

/**
 * Calcula la habitabilidad que corresponde según el manual AIS.
 *
 *   Las cuatro en bajo ................................ verde
 *   Al menos una en bajo_medidas (ninguna peor) ....... amarillo
 *   Al menos una en alto .............................. naranja
 *   Al menos una en muy_alto, o más de dos en alto .... rojo
 *
 * @param {{estabilidad, geotecnico, estructural, no_estructural}} riesgos
 * @returns {string|null} null si falta algún riesgo por asignar
 */
export function habitabilidadSugerida(riesgos) {
  const r = [
    riesgos.estabilidad,
    riesgos.geotecnico,
    riesgos.estructural,
    riesgos.no_estructural,
  ];

  if (r.some(x => !NIVELES_RIESGO.includes(x))) return null;

  const muyAltos = r.filter(x => x === 'muy_alto').length;
  const altos    = r.filter(x => x === 'alto').length;

  if (muyAltos >= 1 || altos > 2) return 'rojo';
  if (altos >= 1)                 return 'naranja';
  if (r.includes('bajo_medidas')) return 'amarillo';
  return 'verde';
}

/**
 * Compara lo que marcó el ingeniero contra lo que dice la regla.
 * NUNCA sobreescribe: solo informa. El criterio es del profesional que firma.
 */
export function verificarHabitabilidad(riesgos, elegida) {
  const sugerida = habitabilidadSugerida(riesgos);
  if (sugerida === null) {
    return { ok: false, incompleto: true, sugerida: null,
             mensaje: 'Faltan niveles de riesgo por asignar.' };
  }
  if (!elegida) {
    return { ok: false, incompleto: true, sugerida,
             mensaje: `Según los riesgos corresponde ${ETIQUETA_HABITABILIDAD[sugerida].toUpperCase()}.` };
  }
  if (elegida === sugerida) return { ok: true, sugerida, discrepancia: false };

  return {
    ok: false,
    discrepancia: true,
    sugerida,
    requiereJustificacion: true,
    mensaje: `Según los riesgos marcados corresponde ` +
             `${ETIQUETA_HABITABILIDAD[sugerida].toUpperCase()}, ` +
             `pero seleccionaste ${ETIQUETA_HABITABILIDAD[elegida].toUpperCase()}. ` +
             `Confirma y explica el motivo.`,
  };
}

// ---------------------------------------------------------------------
// Validación de la matriz de daños
// ---------------------------------------------------------------------

const NIVELES_DANO = ['ninguno', 'leve', 'moderado', 'fuerte', 'severo'];

/**
 * Cada fila (elemento) debe repartir exactamente 100% entre los cinco niveles.
 * Este es el error más común del formulario en papel.
 */
export function validarMatrizDanos(filas) {
  const errores = [];

  for (const fila of filas) {
    const suma = NIVELES_DANO.reduce((acc, n) => acc + (Number(fila[n]) || 0), 0);
    if (suma !== 100) {
      errores.push({
        elemento: fila.elemento,
        suma,
        mensaje: `"${fila.elemento}" suma ${suma}%. Debe sumar exactamente 100%.`,
        faltante: 100 - suma,
      });
    }
    for (const n of NIVELES_DANO) {
      const v = Number(fila[n]);
      if (Number.isNaN(v) || v < 0 || v > 100) {
        errores.push({ elemento: fila.elemento,
                       mensaje: `Valor inválido en "${n}" de "${fila.elemento}".` });
      }
    }
  }
  return { ok: errores.length === 0, errores };
}

/** Reparte el faltante en el nivel "ninguno". Atajo de interfaz, no automatismo. */
export function completarConNinguno(fila) {
  const otros = ['leve', 'moderado', 'fuerte', 'severo']
    .reduce((acc, n) => acc + (Number(fila[n]) || 0), 0);
  return { ...fila, ninguno: Math.max(0, 100 - otros) };
}

// ---------------------------------------------------------------------
// Escalación automática a ingeniero nivel A
// ---------------------------------------------------------------------

const USOS_INDISPENSABLES = [3, 4, 5, 8];              // educacional, salud, hotelero, institucional
const SISTEMAS_VULNERABLES = [51, 52, 23];             // bahareque, tapia, mampostería no reforzada

/**
 * Reglas duras. No son criterio del moderador: se evalúan solas al validar.
 * @returns {string[]} motivos; si viene vacío, puede ir a un ingeniero B.
 */
export function motivosEscalacionA(reporte, contexto = {}) {
  const m = [];

  if (USOS_INDISPENSABLES.includes(Number(reporte.uso_declarado)))
    m.push('uso_indispensable');

  if (Number(reporte.pisos_declarados) > 3)
    m.push('mas_de_3_pisos');

  if (reporte.menciona_colapso)     m.push('menciona_colapso');
  if (reporte.menciona_inclinacion) m.push('menciona_inclinacion');
  if (reporte.menciona_geotecnico)  m.push('indicio_geotecnico');

  if (SISTEMAS_VULNERABLES.includes(Number(reporte.sistema_estructural)))
    m.push('sistema_vulnerable');

  if ((contexto.reportesDelPredio ?? 0) >= 3)
    m.push('multiples_reportes');

  if (['naranja', 'rojo'].includes(contexto.dictamenPrevio))
    m.push('reinspeccion_tras_dictamen_critico');

  return m;
}

// ---------------------------------------------------------------------
// Corte de emergencia
// ---------------------------------------------------------------------

const PATRONES_EMERGENCIA = [
  /atrapad/i, /sepultad/i, /bajo (los )?escombros/i,
  /se est[aá] cayendo/i, /colapsando/i, /derrumb[aá]ndose/i,
  /incendio/i, /fuego/i, /olor a gas/i, /fuga de gas/i,
  /herid/i, /no puede salir/i, /gritos/i,
];

/**
 * Si el reporte describe riesgo inmediato para la vida, la interfaz
 * interrumpe y manda al 123 ANTES de dejar continuar.
 */
export function requiereLlamar123(texto = '', banderas = {}) {
  if (banderas.personasAtrapadas || banderas.colapsoEnCurso) return true;
  return PATRONES_EMERGENCIA.some(p => p.test(texto));
}

// ---------------------------------------------------------------------
// Utilidades de foto
// ---------------------------------------------------------------------

export const MAX_FOTOS_POR_REPORTE = 100;

export const CATEGORIAS_FOTO = {
  obligatorias: ['fachada_principal', 'entorno_vecinos', 'suelo_alrededor'],
  libres: [
    'columnas_muros', 'vigas', 'nudos_conexiones', 'entrepisos_cielos',
    'muros_fachada', 'escaleras', 'cubierta', 'tanques_instalaciones',
    'grietas_detalle', 'otras',
  ],
};

export function validarCoberturaFotos(fotos) {
  const faltantes = CATEGORIAS_FOTO.obligatorias
    .filter(c => !fotos.some(f => f.categoria === c));
  return {
    ok: faltantes.length === 0 && fotos.length <= MAX_FOTOS_POR_REPORTE,
    faltantes,
    excede: fotos.length > MAX_FOTOS_POR_REPORTE,
    total: fotos.length,
  };
}
