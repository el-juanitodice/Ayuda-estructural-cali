export function requiereLlamar123(
  texto: string,
  banderas?: { personasAtrapadas?: boolean; colapsoEnCurso?: boolean },
): boolean;

export function motivosEscalacionA(
  reporte: Record<string, unknown>,
  contexto?: { reportesDelPredio?: number; dictamenPrevio?: string | null },
): string[];

export const USOS: Record<number, string>;
export const NIVELES_RIESGO: string[];
export const HABITABILIDAD: string[];
export const ETIQUETA_HABITABILIDAD: Record<string, string>;
export const SISTEMAS_ESTRUCTURALES: Record<number, string>;
export const MAX_FOTOS_POR_REPORTE: number;
export const CATEGORIAS_FOTO: {
  obligatorias: string[];
  libres: string[];
};

export function habitabilidadSugerida(riesgos: {
  estabilidad: string;
  geotecnico: string;
  estructural: string;
  no_estructural: string;
}): string | null;

export function elementosEstructurales(sistema: number): string[];

export function validarMatrizDanos(
  filas: Array<{
    elemento: string;
    ninguno: number;
    leve: number;
    moderado: number;
    fuerte: number;
    severo: number;
  }>,
): { ok: boolean; errores: Array<{ elemento: string; mensaje: string; suma?: number; faltante?: number }> };

export function completarConNinguno(fila: {
  leve: number;
  moderado: number;
  fuerte: number;
  severo: number;
}): { ninguno: number };

export function verificarHabitabilidad(
  riesgos: {
    estabilidad: string;
    geotecnico: string;
    estructural: string;
    no_estructural: string;
  },
  elegida: string | null,
): {
  ok: boolean;
  incompleto?: boolean;
  sugerida: string | null;
  discrepancia?: boolean;
  requiereJustificacion?: boolean;
  mensaje?: string;
};
