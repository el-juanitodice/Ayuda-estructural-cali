import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EstadoReporte } from '../../common/enums/dominio.enum';

@Entity('reportes')
export class Reporte {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'char', length: 36 })
  uuid!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20, nullable: true })
  consecutivo!: string | null;

  @Column({ name: 'reportante_nombre', type: 'varchar', length: 120 })
  reportanteNombre!: string;

  @Column({ name: 'reportante_telefono', type: 'varchar', length: 20 })
  reportanteTelefono!: string;

  @Column({ name: 'reportante_relacion', type: 'varchar', length: 40, nullable: true })
  reportanteRelacion!: string | null;

  @Column({ type: 'varchar', length: 200 })
  direccion!: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  barrio!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  comuna!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lat!: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lng!: number;

  @Column({ name: 'precision_gps_m', type: 'smallint', nullable: true })
  precisionGpsM!: number | null;

  @Column({ name: 'tipo_edificacion', type: 'varchar', length: 40, nullable: true })
  tipoEdificacion!: string | null;

  @Column({ name: 'pisos_declarados', type: 'smallint', nullable: true })
  pisosDeclarados!: number | null;

  @Column({ name: 'unidades_declaradas', type: 'smallint', nullable: true })
  unidadesDeclaradas!: number | null;

  @Column({ type: 'boolean', nullable: true })
  habitada!: boolean | null;

  @Column({ name: 'uso_declarado', type: 'smallint', nullable: true })
  usoDeclarado!: number | null;

  @Column({ type: 'text', nullable: true })
  descripcion!: string | null;

  @Column({ name: 'menciona_colapso', type: 'boolean', default: false })
  mencionaColapso!: boolean;

  @Column({ name: 'menciona_inclinacion', type: 'boolean', default: false })
  mencionaInclinacion!: boolean;

  @Column({ name: 'menciona_geotecnico', type: 'boolean', default: false })
  mencionaGeotecnico!: boolean;

  @Column({ type: 'enum', enum: EstadoReporte, default: EstadoReporte.NUEVO })
  estado!: EstadoReporte;

  @Column({ name: 'requiere_nivel_a', type: 'boolean', default: false })
  requiereNivelA!: boolean;

  @Column({ name: 'motivo_escalacion', type: 'json', nullable: true })
  motivoEscalacion!: string[] | null;

  @Column({ name: 'motivo_descarte', type: 'varchar', length: 40, nullable: true })
  motivoDescarte!: string | null;

  @Column({ name: 'notas_llamada', type: 'text', nullable: true })
  notasLlamada!: string | null;

  @Column({ name: 'validado_en', type: 'datetime', nullable: true })
  validadoEn!: Date | null;

  @CreateDateColumn({ name: 'creado_en', type: 'datetime' })
  creadoEn!: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'datetime' })
  actualizadoEn!: Date;
}
