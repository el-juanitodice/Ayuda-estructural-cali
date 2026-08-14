import { httpClient } from '@/api/http.client';
import type {
  CoberturaTableroResponse,
  DiscrepanciasTableroResponse,
  VencimientosTableroResponse,
} from '@/types/tablero';

export const tableroService = {
  cobertura: async (): Promise<CoberturaTableroResponse> => {
    return httpClient.get<CoberturaTableroResponse>('/tablero/cobertura');
  },

  vencimientos: async (): Promise<VencimientosTableroResponse> => {
    return httpClient.get<VencimientosTableroResponse>('/tablero/vencimientos');
  },

  discrepancias: async (): Promise<DiscrepanciasTableroResponse> => {
    return httpClient.get<DiscrepanciasTableroResponse>('/tablero/discrepancias');
  },

  exportarCsv: async (nombreArchivo: string): Promise<void> => {
    await httpClient.descargarArchivo('/tablero/exportar?formato=csv', nombreArchivo);
  },
};
