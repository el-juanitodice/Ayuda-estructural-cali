import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrigenFoto } from '../../common/enums/foto.enum';
import type { ExifFoto } from '../../common/interfaces/exif-foto.interface';
import { Reporte } from './reporte.entity';
import { Usuario } from './usuario.entity';

@Entity('fotos')
@Index(['reporteId', 'categoria', 'orden'])
export class Foto {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'char', length: 36, unique: true })
  uuid!: string;

  @Column({ name: 'reporte_id', type: 'bigint' })
  reporteId!: string;

  @Column({ type: 'enum', enum: OrigenFoto })
  origen!: OrigenFoto;

  @Column({ name: 'subida_por', type: 'bigint', nullable: true })
  subidaPorId!: string | null;

  @Column({ type: 'varchar', length: 60 })
  categoria!: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  piso!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nota!: string | null;

  /** Ruta relativa dentro del directorio de uploads (ej. reportes/uuid/foto-full.webp) */
  @Column({ name: 'ruta_full', type: 'varchar', length: 512 })
  rutaFull!: string;

  @Column({ name: 'ruta_thumb', type: 'varchar', length: 512 })
  rutaThumb!: string;

  @Column({ name: 'bytes_full', type: 'int', nullable: true })
  bytesFull!: number | null;

  @Column({ name: 'bytes_thumb', type: 'int', nullable: true })
  bytesThumb!: number | null;

  @Column({ type: 'smallint', nullable: true })
  ancho!: number | null;

  @Column({ type: 'smallint', nullable: true })
  alto!: number | null;

  @Column({ type: 'varchar', length: 10, default: 'webp' })
  formato!: string;

  /** GPS y fecha de captura — JSON en MySQL */
  @Column({ type: 'json', nullable: true })
  exif!: ExifFoto | null;

  @Column({ type: 'smallint', default: 0 })
  orden!: number;

  @CreateDateColumn({ name: 'creado_en', type: 'datetime' })
  creadoEn!: Date;

  @ManyToOne(() => Reporte, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporte_id' })
  reporte!: Reporte;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'subida_por' })
  subidaPor!: Usuario | null;
}
