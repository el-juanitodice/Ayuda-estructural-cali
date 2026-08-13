import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { HabitabilidadColor } from '../../common/enums/dominio.enum';
import { Reporte } from './reporte.entity';
import { Usuario } from './usuario.entity';

export enum EstadoFormulario {
  BORRADOR = 'borrador',
  CAPTURADO = 'capturado',
  FIRMADO = 'firmado',
}

export interface DanoAis {
  grupo: string;
  elemento: string;
  pct_ninguno: number;
  pct_leve: number;
  pct_moderado: number;
  pct_fuerte: number;
  pct_severo: number;
}

@Entity('formularios_ais')
export class FormularioAis {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'char', length: 36, unique: true })
  uuid!: string;

  @Column({ name: 'reporte_id', type: 'bigint' })
  reporteId!: string;

  @Column({ type: 'enum', enum: EstadoFormulario, default: EstadoFormulario.BORRADOR })
  estado!: EstadoFormulario;

  @Column({ name: 'capturado_por', type: 'bigint', nullable: true })
  capturadoPorId!: string | null;

  @Column({ name: 'capturado_en', type: 'datetime', nullable: true })
  capturadoEn!: Date | null;

  @Column({ name: 'visita_presencial_b', type: 'boolean', nullable: true })
  visitaPresencialB!: boolean | null;

  @Column({ name: 'visita_presencial_a', type: 'boolean', nullable: true })
  visitaPresencialA!: boolean | null;

  @Column({ name: 'sistema_estructural', type: 'smallint', nullable: true })
  sistemaEstructural!: number | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  colapso!: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  inclinacion!: string | null;

  @Column({ name: 'porcentaje_dano', type: 'varchar', length: 40, nullable: true })
  porcentajeDano!: string | null;

  @Column({ name: 'piso_mayor_dano', type: 'varchar', length: 10, nullable: true })
  pisoMayorDano!: string | null;

  @Column({ type: 'text', nullable: true })
  comentarios!: string | null;

  @Column({ name: 'pisos_sobre_terreno', type: 'smallint', nullable: true })
  pisosSobreTerreno!: number | null;

  @Column({ name: 'anio_construccion', type: 'smallint', nullable: true })
  anioConstruccion!: number | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  asentamiento!: string | null;

  @Column({ name: 'falla_talud', type: 'varchar', length: 40, nullable: true })
  fallaTalud!: string | null;

  @Column({ name: 'riesgo_estabilidad', type: 'varchar', length: 20, nullable: true })
  riesgoEstabilidad!: string | null;

  @Column({ name: 'riesgo_geotecnico', type: 'varchar', length: 20, nullable: true })
  riesgoGeotecnico!: string | null;

  @Column({ name: 'riesgo_estructural', type: 'varchar', length: 20, nullable: true })
  riesgoEstructural!: string | null;

  @Column({ name: 'riesgo_no_estructural', type: 'varchar', length: 20, nullable: true })
  riesgoNoEstructural!: string | null;

  @Column({ name: 'habitabilidad_sugerida', type: 'enum', enum: HabitabilidadColor, nullable: true })
  habitabilidadSugerida!: HabitabilidadColor | null;

  @Column({ name: 'habitabilidad_final', type: 'enum', enum: HabitabilidadColor, nullable: true })
  habitabilidadFinal!: HabitabilidadColor | null;

  @Column({ name: 'motivo_discrepancia', type: 'text', nullable: true })
  motivoDiscrepancia!: string | null;

  @Column({ name: 'firmado_por', type: 'bigint', nullable: true })
  firmadoPorId!: string | null;

  @Column({ name: 'firmado_en', type: 'datetime', nullable: true })
  firmadoEn!: Date | null;

  @Column({ type: 'json', nullable: true })
  danos!: DanoAis[] | null;

  @CreateDateColumn({ name: 'creado_en', type: 'datetime' })
  creadoEn!: Date;

  @ManyToOne(() => Reporte, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporte_id' })
  reporte!: Reporte;

  @ManyToOne(() => Usuario, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'capturado_por' })
  capturadoPor!: Usuario | null;

  @ManyToOne(() => Usuario, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'firmado_por' })
  firmadoPor!: Usuario | null;
}
