import { Injectable, OnModuleInit } from '@nestjs/common';

type AisModule = typeof import('../../../../shared/ais.js');

@Injectable()
export class AisService implements OnModuleInit {
  private ais!: AisModule;

  async onModuleInit() {
    this.ais = await import('../../../../shared/ais.js');
  }

  requiereLlamar123(
    texto: string,
    banderas: { personasAtrapadas?: boolean; colapsoEnCurso?: boolean } = {},
  ) {
    return this.ais.requiereLlamar123(texto, banderas);
  }

  get usos() {
    return this.ais.USOS;
  }

  get categoriasFoto() {
    return this.ais.CATEGORIAS_FOTO;
  }

  get maxFotosPorReporte() {
    return this.ais.MAX_FOTOS_POR_REPORTE;
  }

  motivosEscalacionA(
    reporte: Record<string, unknown>,
    contexto: { reportesDelPredio?: number; dictamenPrevio?: string | null } = {},
  ) {
    return this.ais.motivosEscalacionA(reporte, contexto);
  }

  habitabilidadSugerida(riesgos: {
    estabilidad: string;
    geotecnico: string;
    estructural: string;
    no_estructural: string;
  }) {
    return this.ais.habitabilidadSugerida(riesgos);
  }

  verificarHabitabilidad(
    riesgos: {
      estabilidad: string;
      geotecnico: string;
      estructural: string;
      no_estructural: string;
    },
    elegida: string | null,
  ) {
    return this.ais.verificarHabitabilidad(riesgos, elegida);
  }

  get nivelesRiesgo() {
    return this.ais.NIVELES_RIESGO;
  }

  get habitabilidadColores() {
    return this.ais.HABITABILIDAD;
  }

  get etiquetaHabitabilidad() {
    return this.ais.ETIQUETA_HABITABILIDAD;
  }

  get sistemasEstructurales() {
    return this.ais.SISTEMAS_ESTRUCTURALES;
  }

  elementosEstructurales(sistema: number) {
    return this.ais.elementosEstructurales(sistema);
  }

  validarMatrizDanos(
    filas: Array<{
      elemento: string;
      ninguno: number;
      leve: number;
      moderado: number;
      fuerte: number;
      severo: number;
    }>,
  ) {
    return this.ais.validarMatrizDanos(filas);
  }

  completarConNinguno(fila: {
    leve: number;
    moderado: number;
    fuerte: number;
    severo: number;
  }) {
    return this.ais.completarConNinguno(fila);
  }
}
