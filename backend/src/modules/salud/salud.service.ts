import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class SaludService {
  constructor(private readonly dataSource: DataSource) {}

  async verificar() {
    await this.dataSource.query('SELECT 1');
    return {
      ok: true,
      motor: 'mysql',
      version: this.dataSource.options.type,
    };
  }
}
