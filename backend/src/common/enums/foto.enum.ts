/** Valores fijos de contexto. Roles dinámicos usan slug del nombre del rol (VARCHAR en BD). */
export enum OrigenFoto {
  CIUDADANO = 'ciudadano',
  INGENIERO_B = 'ingeniero_b',
  INGENIERO_A = 'ingeniero_a',
}

export enum VarianteFoto {
  FULL = 'full',
  THUMB = 'thumb',
}
