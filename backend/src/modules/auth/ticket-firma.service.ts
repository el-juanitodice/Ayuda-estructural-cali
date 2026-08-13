import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface EntradaTicket {
  usuarioUuid: string;
  expira: number;
}

@Injectable()
export class TicketFirmaService {
  private readonly tickets = new Map<string, EntradaTicket>();

  constructor(private readonly config: ConfigService) {}

  emitir(usuarioUuid: string): { ticket_firma: string; valido_minutos: number } {
    const validoMinutos = this.config.get<number>('auth.ticketFirmaTtlMinutos', 5);
    const ticket = randomBytes(32).toString('base64url');
    this.tickets.set(ticket, {
      usuarioUuid,
      expira: Date.now() + validoMinutos * 60_000,
    });
    return { ticket_firma: ticket, valido_minutos: validoMinutos };
  }

  validar(ticket: string, usuarioUuid: string): boolean {
    const entrada = this.tickets.get(ticket);
    if (!entrada || entrada.usuarioUuid !== usuarioUuid || entrada.expira < Date.now()) {
      return false;
    }
    this.tickets.delete(ticket);
    return true;
  }
}
