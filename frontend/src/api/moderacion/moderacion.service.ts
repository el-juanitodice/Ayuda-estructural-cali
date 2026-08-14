import { httpClient } from '@/api/http.client';
import type {
  ColaModeracionResponse,
  IngenieroDisponible,
  ValidarResponse,
} from '@/types/moderation';
import type { FotoResumen } from '@/types/revision';

export const moderacionService = {
  obtenerCola: async (): Promise<ColaModeracionResponse> => {
    return httpClient.get<ColaModeracionResponse>('/moderacion/cola');
  },

  listarIngenieros: async (): Promise<IngenieroDisponible[]> => {
    const r = await httpClient.get<{ ingenieros: IngenieroDisponible[] }>(
      '/moderacion/ingenieros',
    );
    return r.ingenieros;
  },

  validar: async (
    reporteUuid: string,
    payload: unknown,
  ): Promise<ValidarResponse> => {
    return httpClient.post<ValidarResponse>(`/moderacion/${reporteUuid}/validar`, payload);
  },

  descartar: async (reporteUuid: string, motivo: string): Promise<void> => {
    await httpClient.post(`/moderacion/${reporteUuid}/descartar`, { motivo });
  },

  asignar: async (reporteUuid: string, payload: unknown): Promise<void> => {
    await httpClient.post(`/moderacion/${reporteUuid}/asignar`, payload);
  },

  eliminarReporte: async (reporteUuid: string): Promise<void> => {
    await httpClient.delete(`/moderacion/${reporteUuid}`);
  },

  fotosReporte: async (reporteUuid: string): Promise<FotoResumen[]> => {
    const r = await httpClient.get<{ fotos: FotoResumen[] }>(`/fotos/reporte/${reporteUuid}`);
    return r.fotos;
  },
};
