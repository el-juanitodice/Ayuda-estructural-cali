import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { Role } from './role.entity';
import { TokenAcceso } from './token-acceso.entity';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'char', length: 36, unique: true })
  uuid!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 120 })
  nombre!: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telefono!: string | null;

  @ManyToOne(() => Role, (role) => role.usuarios, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'role_id', foreignKeyConstraintName: 'fk_usuarios_role' })
  role!: Role | null;

  @RelationId((usuario: Usuario) => usuario.role)
  roleId!: string | null;

  @Column({ name: 'hash_clave', type: 'varchar', length: 255, nullable: true })
  hashClave!: string | null;

  @Column({ name: 'clave_definida_en', type: 'datetime', nullable: true })
  claveDefinidaEn!: Date | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  matricula!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  profesion!: string | null;

  @Column({ name: 'matricula_verificada_en', type: 'datetime', nullable: true })
  matriculaVerificadaEn!: Date | null;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @Column({ name: 'intentos_fallidos', type: 'smallint', default: 0 })
  intentosFallidos!: number;

  @Column({ name: 'bloqueado_hasta', type: 'datetime', nullable: true })
  bloqueadoHasta!: Date | null;

  @Column({ name: 'ultimo_acceso', type: 'datetime', nullable: true })
  ultimoAcceso!: Date | null;

  @CreateDateColumn({ name: 'creado_en', type: 'datetime' })
  creadoEn!: Date;

  @OneToMany(() => TokenAcceso, (token) => token.usuario)
  tokensAcceso!: TokenAcceso[];
}
