import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PropositoToken } from '../../common/enums/dominio.enum';
import { Usuario } from './usuario.entity';

@Entity('tokens_acceso')
export class TokenAcceso {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'usuario_id', type: 'bigint' })
  usuarioId!: string;

  @Column({ name: 'token_hash', type: 'varchar', length: 64, unique: true })
  tokenHash!: string;

  @Column({ type: 'enum', enum: PropositoToken })
  proposito!: PropositoToken;

  @Column({ name: 'expira_en', type: 'datetime' })
  expiraEn!: Date;

  @Column({ name: 'usado_en', type: 'datetime', nullable: true })
  usadoEn!: Date | null;

  @CreateDateColumn({ name: 'creado_en', type: 'datetime' })
  creadoEn!: Date;

  @ManyToOne(() => Usuario, (usuario) => usuario.tokensAcceso, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario!: Usuario;
}
