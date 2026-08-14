import { httpClient } from '@/api/http.client';
import type { MapaResponse } from '@/types/map';
import type { CrearReporteResponse, EstadoReporteResponse } from '@/types/report';

export const reportesService = {
  obtenerMapa: async (): Promise<MapaResponse> => {
    return httpClient.get<MapaResponse>('/mapa');
  },

  crearReporte: async (payload: unknown): Promise<CrearReporteResponse> => {
    return httpClient.post<CrearReporteResponse>('/reportes', payload);
  },

  consultarEstado: async (consecutivo: string): Promise<EstadoReporteResponse> => {
    return httpClient.get<EstadoReporteResponse>(
      `/reportes/${consecutivo.trim().toUpperCase()}/estado`,
    );
  },
};
