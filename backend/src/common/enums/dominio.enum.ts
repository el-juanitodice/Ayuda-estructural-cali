export enum RolUsuario {
  ADMIN = 'admin',
  COORDINADOR = 'coordinador',
  MODERADOR = 'moderador',
  INGENIERO_A = 'ingeniero_a',
  INGENIERO_B = 'ingeniero_b',
}

export enum EstadoReporte {
  NUEVO = 'nuevo',
  VALIDADO = 'validado',
  DESCARTADO = 'descartado',
  ASIGNADO = 'asignado',
  EN_CAPTURA = 'en_captura',
  EN_REVISION_A = 'en_revision_a',
  REQUIERE_ESPECIALISTA = 'requiere_especialista',
  VENCIDO = 'vencido',
  CERRADO = 'cerrado',
}

export enum PropositoToken {
  ALTA_CLAVE = 'alta_clave',
  RECUPERAR_CLAVE = 'recuperar_clave',
}

export enum HabitabilidadColor {
  VERDE = 'verde',
  AMARILLO = 'amarillo',
  NARANJA = 'naranja',
  ROJO = 'rojo',
  GRIS = 'gris',
}

export enum NivelRiesgo {
  BAJO = 'bajo',
  BAJO_MEDIDAS = 'bajo_medidas',
  ALTO = 'alto',
  MUY_ALTO = 'muy_alto',
}
