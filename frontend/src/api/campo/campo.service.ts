import { httpClient } from '@/api/http.client';
import type { GuardarFormularioResponse, MisAsignacionesResponse } from '@/types/campo';
import type {
  ColaRevisionResponse,
  FirmarResponse,
  FormularioResponse,
} from '@/types/revision';

export const campoService = {
  misAsignaciones: async (): Promise<MisAsignacionesResponse> => {
    return httpClient.get<MisAsignacionesResponse>('/campo/mis-asignaciones');
  },

  guardarFormulario: async (payload: unknown): Promise<GuardarFormularioResponse> => {
    return httpClient.post<GuardarFormularioResponse>('/campo/formularios', payload);
  },

  obtenerFormulario: async (formularioUuid: string): Promise<FormularioResponse> => {
    return httpClient.get<FormularioResponse>(`/campo/formularios/${formularioUuid}`);
  },

  colaRevision: async (): Promise<ColaRevisionResponse> => {
    return httpClient.get<ColaRevisionResponse>('/campo/revision');
  },

  firmarDictamen: async (
    formularioUuid: string,
    payload: unknown,
  ): Promise<FirmarResponse> => {
    return httpClient.post<FirmarResponse>(
      `/campo/formularios/${formularioUuid}/firmar`,
      payload,
    );
  },
};
