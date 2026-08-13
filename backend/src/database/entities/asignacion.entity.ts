import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RolUsuario } from '../../common/enums/dominio.enum';
import { Reporte } from './reporte.entity';
import { Usuario } from './usuario.entity';

@Entity('asignaciones')
export class Asignacion {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'reporte_id', type: 'bigint' })
  reporteId!: string;

  @Column({ name: 'ingeniero_id', type: 'bigint' })
  ingenieroId!: string;

  @Column({ name: 'asignado_por', type: 'bigint' })
  asignadoPorId!: string;

  @Column({ name: 'rol_asignado', type: 'enum', enum: RolUsuario })
  rolAsignado!: RolUsuario;

  @Column({ name: 'vence_en', type: 'datetime' })
  venceEn!: Date;

  @Column({ name: 'cerrada_en', type: 'datetime', nullable: true })
  cerradaEn!: Date | null;

  @Column({ name: 'liberada_en', type: 'datetime', nullable: true })
  liberadaEn!: Date | null;

  @CreateDateColumn({ name: 'creado_en', type: 'datetime' })
  creadoEn!: Date;

  @ManyToOne(() => Reporte, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporte_id' })
  reporte!: Reporte;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ingeniero_id' })
  ingeniero!: Usuario;
}
