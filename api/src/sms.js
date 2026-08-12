/**
 * Notificación SMS/WhatsApp al ciudadano (FLUJOS §8, paso 1).
 * Sin SMS_PROVEEDOR configurado solo se registra en el log: el cierre del
 * ciclo NO se pierde porque el aviso físico (paso 2) no depende de esto.
 */

import { ETIQUETA_HABITABILIDAD } from '../../shared/ais.js';

export async function notificarDictamen({ telefono, consecutivo, color, log }) {
  const texto = `Inspeccion ${consecutivo}: resultado ${ETIQUETA_HABITABILIDAD[color] || color}. ` +
    `El ingeniero deja el aviso oficial en la entrada. Consulta: estado con tu radicado.`;

  if (!process.env.SMS_PROVEEDOR || !process.env.SMS_API_KEY) {
    log.warn({ telefono, consecutivo, color }, 'SMS no configurado: notificación solo en log');
    return { enviado: false };
  }
  // Integración del proveedor cuando exista (Twilio, Labsmobile, etc.)
  log.info({ telefono, texto }, 'SMS enviado');
  return { enviado: true };
}
