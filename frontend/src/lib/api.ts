import { API_BASE } from '@/config/api';
import { clearAccessToken, getAccessToken } from '@/lib/token';

export interface ApiErrorBody {
  error?: string;
  mensaje?: string;
  uuid?: string;
  consecutivo?: string;
  message?: string | string[];
  statusCode?: number;
}

export class ErrorApi extends Error {
  status: number;
  codigo?: string;
  cuerpo: ApiErrorBody;

  constructor(status: number, cuerpo: ApiErrorBody = {}) {
    super(mensajeDesdeCuerpo(status, cuerpo));
    this.name = 'ErrorApi';
    this.status = status;
    this.codigo = cuerpo.error;
    this.cuerpo = cuerpo;
  }
}

function mensajeDesdeCuerpo(status: number, cuerpo: ApiErrorBody): string {
  if (cuerpo.mensaje) return cuerpo.mensaje;
  if (cuerpo.error === 'demasiadas_solicitudes') {
    return 'Has superado el límite de solicitudes por hora. Espera unos minutos e intenta de nuevo.';
  }
  if (Array.isArray(cuerpo.message)) return cuerpo.message.join('. ');
  if (typeof cuerpo.message === 'string') return cuerpo.message;
  return `Error ${status}`;
}

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function pedir<T>(metodo: string, ruta: string, datos?: unknown): Promise<T> {
  const headers: Record<string, string> = { ...authHeaders() };
  if (datos) headers['content-type'] = 'application/json';

  const url = `${API_BASE}${ruta}`;

  let r: Response;
  try {
    r = await fetch(url, {
      method: metodo,
      headers,
      body: datos ? JSON.stringify(datos) : undefined,
    });
  } catch {
    const hint =
      import.meta.env.DEV && API_BASE.includes('localhost')
        ? ' En el celular no uses localhost; deja VITE_API_BASE=/api/v1.'
        : '';
    throw new Error(`No se pudo conectar al servidor.${hint}`);
  }

  const cuerpo = (await r.json().catch(() => ({}))) as ApiErrorBody;
  if (r.status === 401) clearAccessToken();
  if (!r.ok) throw new ErrorApi(r.status, cuerpo);
  return cuerpo as T;
}

export const get = <T>(ruta: string) => pedir<T>('GET', ruta);
export const post = <T>(ruta: string, datos?: unknown) => pedir<T>('POST', ruta, datos);
export const patch = <T>(ruta: string, datos?: unknown) => pedir<T>('PATCH', ruta, datos);
export const del = <T>(ruta: string) => pedir<T>('DELETE', ruta);

export async function descargarArchivo(ruta: string, nombreArchivo: string): Promise<void> {
  const r = await fetch(`${API_BASE}${ruta}`, { headers: authHeaders() });
  if (r.status === 401) clearAccessToken();
  if (!r.ok) {
    const cuerpo = (await r.json().catch(() => ({}))) as ApiErrorBody;
    throw new ErrorApi(r.status, cuerpo);
  }
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
  URL.revokeObjectURL(url);
}

export async function postFormData<T>(ruta: string, formData: FormData): Promise<T> {
  const r = await fetch(`${API_BASE}${ruta}`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  const cuerpo = (await r.json().catch(() => ({}))) as ApiErrorBody;
  if (r.status === 401) clearAccessToken();
  if (!r.ok) throw new ErrorApi(r.status, cuerpo);
  return cuerpo as T;
}
