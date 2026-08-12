/** Cliente HTTP mínimo. Cookies de sesión van solas (same-origin). */

const BASE = '/api/v1';

export class ErrorApi extends Error {
  constructor(status, cuerpo) {
    super(cuerpo?.mensaje || `Error ${status}`);
    this.status = status;
    this.codigo = cuerpo?.error;
    this.cuerpo = cuerpo;
  }
}

async function pedir(metodo, ruta, datos) {
  const r = await fetch(BASE + ruta, {
    method: metodo,
    headers: datos ? { 'content-type': 'application/json' } : undefined,
    credentials: 'same-origin',
    body: datos ? JSON.stringify(datos) : undefined,
  });
  const cuerpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErrorApi(r.status, cuerpo);
  return cuerpo;
}

export const get = (ruta) => pedir('GET', ruta);
export const post = (ruta, datos) => pedir('POST', ruta, datos);
