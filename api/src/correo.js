/**
 * Correo vía Resend (API HTTPS). ARQUITECTURA §2: Railway bloquea SMTP
 * saliente fuera del plan Pro; Resend funciona en cualquier plan.
 *
 * Solo dos usos: enlace de alta de contraseña y recuperación.
 * Sin RESEND_API_KEY (desarrollo) el enlace se imprime en el log.
 */

import { Resend } from 'resend';
import { config } from './config.js';

const resend = config.correo.resendApiKey ? new Resend(config.correo.resendApiKey) : null;

export async function enviarEnlaceClave({ email, nombre, token, proposito, log }) {
  const ruta = proposito === 'alta_clave' ? 'definir-clave' : 'recuperar-clave';
  const enlace = `${config.urlBase}/#/${ruta}?token=${token}`;

  if (!resend) {
    log.warn({ email, enlace }, 'RESEND_API_KEY ausente: enlace solo en el log (modo desarrollo)');
    return;
  }

  const asunto = proposito === 'alta_clave'
    ? 'Activa tu cuenta — Inspección post-sísmica Cali'
    : 'Recuperación de contraseña — Inspección post-sísmica Cali';

  try {
    await enviar({ email, nombre, asunto, enlace, proposito });
  } catch (err) {
    // El correo NUNCA debe tumbar el flujo (p. ej. dominio aún sin verificar
    // en Resend): el enlace queda en el log como respaldo.
    log.error({ err: err.message, email, enlace }, 'Fallo el envío de correo: enlace en el log');
  }
}

async function enviar({ email, nombre, asunto, enlace, proposito }) {
  await resend.emails.send({
    from: config.correo.remitente,
    to: email,
    subject: asunto,
    text: [
      `Hola ${nombre},`,
      '',
      proposito === 'alta_clave'
        ? 'Te crearon una cuenta en la plataforma de inspección post-sísmica de Cali.'
        : 'Pediste recuperar tu contraseña.',
      'Define tu contraseña en este enlace (válido por 24 horas, un solo uso):',
      '',
      enlace,
      '',
      'Si no esperabas este correo, ignóralo.',
    ].join('\n'),
  });
}
