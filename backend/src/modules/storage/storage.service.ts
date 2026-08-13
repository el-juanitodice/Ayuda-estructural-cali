import { mkdir, writeFile, access, readFile, unlink } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly uploadDir: string;

  constructor(private readonly config: ConfigService) {
    const dir = this.config.get<string>('storage.uploadDir', 'uploads');
    this.uploadDir = resolve(process.cwd(), dir);
  }

  async onModuleInit() {
    await mkdir(this.uploadDir, { recursive: true });
  }

  get directorioRaiz(): string {
    return this.uploadDir;
  }

  /** Genera rutas relativas estándar para una foto de reporte */
  rutasFoto(reporteUuid: string, fotoUuid: string, formato: 'webp' | 'jpeg') {
    const ext = formato === 'webp' ? 'webp' : 'jpg';
    const base = join('reportes', reporteUuid);
    return {
      rutaFull: join(base, `${fotoUuid}-full.${ext}`).replace(/\\/g, '/'),
      rutaThumb: join(base, `${fotoUuid}-thumb.${ext}`).replace(/\\/g, '/'),
    };
  }

  async guardar(relativa: string, buffer: Buffer): Promise<void> {
    const segura = this.resolverRelativa(relativa);
    await mkdir(dirname(segura), { recursive: true });
    await writeFile(segura, buffer);
  }

  async existe(relativa: string): Promise<boolean> {
    try {
      await access(this.resolverRelativa(relativa), constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async leer(relativa: string): Promise<Buffer> {
    return readFile(this.resolverRelativa(relativa));
  }

  async eliminar(relativa: string): Promise<void> {
    try {
      await unlink(this.resolverRelativa(relativa));
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') throw err;
    }
  }

  /** Convierte ruta relativa de BD a ruta absoluta en disco, bloqueando path traversal */
  resolverRelativa(relativa: string): string {
    const limpia = normalize(relativa).replace(/^(\.\.[/\\])+/, '');
    const absoluta = resolve(this.uploadDir, limpia);
    if (!absoluta.startsWith(this.uploadDir)) {
      throw new Error('ruta_invalida');
    }
    return absoluta;
  }

  contentTypeDesdeRuta(relativa: string): string {
    const ext = extname(relativa).toLowerCase();
    if (ext === '.webp') return 'image/webp';
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    return 'application/octet-stream';
  }
}
