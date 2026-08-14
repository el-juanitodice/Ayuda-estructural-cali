import { API_BASE } from '@/config/api';
import { clearAccessToken, getAccessToken } from '@/lib/token';

export interface ApiErrorBody {
  error?: string;
  mensaje?: string;
  uuid?: string;
  consecutivo?: string;
  message?: string | string[];
  statusCode?: number;
  ok?: boolean;
  ya_confirmada?: boolean;
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

export async function parseErrorMessage(
  response: Response,
  fallbackMessage: string,
): Promise<string> {
  try {
    const cuerpo = (await response.json()) as ApiErrorBody;
    return mensajeDesdeCuerpo(response.status, cuerpo);
  } catch {
    return fallbackMessage;
  }
}

function authHeaders(withJsonContentType = false): Record<string, string> {
  const token = getAccessToken();
  return {
    ...(withJsonContentType ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function pedir<T>(metodo: string, ruta: string, datos?: unknown): Promise<T> {
  const headers = authHeaders(Boolean(datos));

  let r: Response;
  try {
    r = await fetch(`${API_BASE}${ruta}`, {
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

export const httpClient = {
  get: <T>(ruta: string) => pedir<T>('GET', ruta),
  post: <T>(ruta: string, datos?: unknown) => pedir<T>('POST', ruta, datos),
  patch: <T>(ruta: string, datos?: unknown) => pedir<T>('PATCH', ruta, datos),
  delete: <T>(ruta: string) => pedir<T>('DELETE', ruta),

  async postFormData<T>(ruta: string, formData: FormData): Promise<T> {
    const r = await fetch(`${API_BASE}${ruta}`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    });
    const cuerpo = (await r.json().catch(() => ({}))) as ApiErrorBody;
    if (r.status === 401) clearAccessToken();
    if (!r.ok) throw new ErrorApi(r.status, cuerpo);
    return cuerpo as T;
  },

  async descargarArchivo(ruta: string, nombreArchivo: string): Promise<void> {
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
  },
};
