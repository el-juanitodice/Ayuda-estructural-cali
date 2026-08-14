/** Textos de cabecera por pantalla — eyebrow, título y contexto. */
export const pageHeaders = {
  mapa: {
    eyebrow: 'Post-sísmico · Cali',
    title: 'Mapa de inspecciones',
    description:
      'Consulta el estado de dictámenes por zona. Los puntos aparecen tras validación telefónica por un moderador.',
  },
  reportar: {
    eyebrow: 'Ciudadanía',
    title: 'Reportar daños',
    description:
      'Describe la situación del predio y marca su ubicación. Un moderador te llamará para confirmar los datos.',
  },
  ingreso: {
    eyebrow: 'Acceso restringido',
    title: 'Ingreso del personal',
    description: 'Solo cuentas creadas por el administrador. El registro público está cerrado.',
  },
  definirClave: {
    eyebrow: 'Acceso restringido',
    title: 'Establecer contraseña',
    description: 'El enlace expira en 24 horas. Usa una frase larga y única.',
  },
  tablero: {
    eyebrow: 'Coordinación',
    title: 'Tablero de coordinación',
    description: 'Cobertura por comuna, asignaciones por vencer y discrepancias de dictamen.',
  },
  campo: {
    eyebrow: 'Campo',
    title: 'Inspección de campo',
    description:
      'Casos activos arriba; abajo puedes consultar capturas anteriores y corregirlas mientras sigan en revisión.',
  },
  revision: {
    eyebrow: 'Revisión A',
    title: 'Revisión nivel A',
    description: 'Pendientes arriba; abajo el historial de dictámenes firmados para consulta.',
  },
  moderacion: {
    eyebrow: 'Moderación',
    title: 'Cola de moderación',
    description: 'Nuevos arriba; procesados en gris abajo. Valida tras llamar al reportante.',
  },
  admin: {
    eyebrow: 'Administración',
    title: 'Usuarios del sistema',
    description: 'Cuentas del personal con acceso al panel.',
  },
  aviso: {
    eyebrow: 'Dictamen',
    title: 'Aviso de habitabilidad',
    description: 'Documento para el predio inspeccionado. Imprime o guarda como PDF.',
  },
} as const;
