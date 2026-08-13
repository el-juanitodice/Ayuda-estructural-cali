import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

interface ErrorBody {
  error: string;
  mensaje: string;
  detalles?: unknown;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'object' && body !== null && 'error' in body) {
        return response.status(status).json(body);
      }

      const rawMessage =
        typeof body === 'string'
          ? body
          : typeof body === 'object' && body !== null && 'message' in body
            ? (body as { message: unknown }).message
            : 'Error en la solicitud';

      if (status === HttpStatus.TOO_MANY_REQUESTS) {
        return response.status(status).json({
          error: 'demasiadas_solicitudes',
          mensaje:
            'Has superado el límite de solicitudes por hora. Espera unos minutos e intenta de nuevo.',
        } satisfies ErrorBody);
      }

      const mensaje = typeof rawMessage === 'string' ? rawMessage : String(rawMessage);

      return response.status(status).json({
        error: this.codigoPorStatus(status),
        mensaje,
      } satisfies ErrorBody);
    }

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: 'interno',
      mensaje: 'Error interno. Intenta de nuevo.',
    } satisfies ErrorBody);
  }

  private codigoPorStatus(status: number): string {
    if (status === 401) return 'no_autorizado';
    if (status === 403) return 'prohibido';
    if (status === 404) return 'no_existe';
    if (status === 409) return 'conflicto';
    if (status === 422) return 'validacion';
    if (status === 429) return 'demasiadas_solicitudes';
    return 'error';
  }
}
