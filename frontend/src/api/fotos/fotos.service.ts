import { API_BASE } from '@/config/api';
import { ErrorApi, type ApiErrorBody } from '@/api/http.client';
import { getAccessToken } from '@/lib/token';

export const fotosService = {
  subir: async (formData: FormData): Promise<ApiErrorBody & { ok?: boolean; ya_confirmada?: boolean }> => {
    const token = getAccessToken();
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    const r = await fetch(`${API_BASE}/fotos/subir`, { method: 'POST', headers, body: formData });
    const cuerpo = (await r.json().catch(() => ({}))) as ApiErrorBody & {
      ok?: boolean;
      ya_confirmada?: boolean;
    };
    if (!r.ok) throw new ErrorApi(r.status, cuerpo);
    return cuerpo;
  },

  fetchBlobUrl: async (uuid: string, tam: 'thumb' | 'full' = 'thumb'): Promise<string> => {
    const token = getAccessToken();
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    const r = await fetch(`${API_BASE}/fotos/${uuid}?tam=${tam}`, { headers });
    if (!r.ok) {
      const cuerpo = (await r.json().catch(() => ({}))) as ApiErrorBody;
      throw new ErrorApi(r.status, cuerpo);
    }
    const blob = await r.blob();
    return URL.createObjectURL(blob);
  },
};
