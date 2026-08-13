import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { PropositoToken } from '../../common/enums/dominio.enum';

@Injectable()
export class CorreoService {
  private readonly logger = new Logger(CorreoService.name);
  private readonly resend: Resend | null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('correo.resendApiKey');
    this.resend = apiKey ? new Resend(apiKey) : null;
  }

  estaConfigurado(): boolean {
    return this.resend !== null;
  }

  construirEnlace(token: string, proposito: PropositoToken): string {
    const frontendBase = this.config.get<string>('app.frontendUrl', 'http://localhost:5173');
    const ruta = proposito === PropositoToken.ALTA_CLAVE ? 'definir-clave' : 'recuperar-clave';
    return `${frontendBase}/${ruta}?token=${token}`;
  }

  async enviarEnlaceClave({
    email,
    nombre,
    token,
    proposito,
  }: {
    email: string;
    nombre: string;
    token: string;
    proposito: PropositoToken;
  }): Promise<void> {
    const enlace = this.construirEnlace(token, proposito);

    if (!this.resend) {
      this.logger.warn(
        `RESEND_API_KEY ausente: enlace solo en log (${email}) → ${enlace}`,
      );
      console.log(`[CORREO WARN] RESEND_API_KEY ausente para ${email}`);
      return;
    }

    const asunto =
      proposito === PropositoToken.ALTA_CLAVE
        ? 'Activa tu cuenta — Inspección post-sísmica Cali'
        : 'Recuperación de contraseña — Inspección post-sísmica Cali';

    try {
      console.log(`[CORREO] Enviando email a ${email} con asunto: ${asunto}`);
      const resultado = await this.resend.emails.send({
        from: this.config.get<string>('correo.remitente', 'no-responder@ejemplo.co'),
        to: email,
        subject: asunto,
        text: [
          `Hola ${nombre},`,
          '',
          proposito === PropositoToken.ALTA_CLAVE
            ? 'Te crearon una cuenta en la plataforma de inspección post-sísmica de Cali.'
            : 'Pediste recuperar tu contraseña.',
          'Define tu contraseña en este enlace (válido por 24 horas, un solo uso):',
          '',
          enlace,
          '',
          'Si no esperabas este correo, ignóralo.',
        ].join('\n'),
      });
      if (resultado.error) {
        console.log(`[CORREO ERROR] ${email}: ${resultado.error}`);
        this.logger.error(`Error enviando email a ${email}: ${resultado.error}`);
      } else {
        console.log(`[CORREO SUCCESS] Email enviado a ${email}`);
        this.logger.log(`Email enviado a ${email} (${proposito})`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`[CORREO ERROR] Excepción al enviar a ${email}: ${msg}`);
      this.logger.error(`Fallo el envío de correo (${email}): ${msg} — enlace: ${enlace}`);
    }
  }
}
