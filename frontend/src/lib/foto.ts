import { API_BASE } from '@/config/api';
import { ErrorApi, type ApiErrorBody } from '@/lib/api';
import { getAccessToken } from '@/lib/token';

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchFotoBlobUrl(
  uuid: string,
  tam: 'thumb' | 'full' = 'thumb',
): Promise<string> {
  const r = await fetch(`${API_BASE}/fotos/${uuid}?tam=${tam}`, { headers: authHeaders() });
  if (!r.ok) {
    const cuerpo = (await r.json().catch(() => ({}))) as ApiErrorBody;
    throw new ErrorApi(r.status, cuerpo);
  }
  const blob = await r.blob();
  return URL.createObjectURL(blob);
}
