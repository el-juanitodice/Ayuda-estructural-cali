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

/**
 * No hubo respuesta del servidor (sin señal, antena saturada, avión).
 * Se distingue del ErrorApi a propósito: esto NO es culpa del usuario ni
 * de sus datos, y siempre se debe poder reintentar solo.
 */
export class ErrorRed extends Error {
  constructor(causa) {
    super('sin_conexion');
    this.codigo = 'sin_conexion';
    this.causa = causa;
  }
}

async function pedir(metodo, ruta, datos) {
  let r;
  try {
    r = await fetch(BASE + ruta, {
      method: metodo,
      headers: datos ? { 'content-type': 'application/json' } : undefined,
      credentials: 'same-origin',
      body: datos ? JSON.stringify(datos) : undefined,
    });
  } catch (err) {
    // fetch solo lanza por fallo de red: "Load failed" (Safari) /
    // "Failed to fetch" (Chrome). Nunca por un 4xx o 5xx.
    throw new ErrorRed(err);
  }
  const cuerpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErrorApi(r.status, cuerpo);
  return cuerpo;
}

export const get = (ruta) => pedir('GET', ruta);
export const post = (ruta, datos) => pedir('POST', ruta, datos);
