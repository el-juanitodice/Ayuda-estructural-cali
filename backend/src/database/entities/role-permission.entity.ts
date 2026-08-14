import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { AppModuleEntity } from './app-module.entity';
import { Role } from './role.entity';

@Entity('role_permissions')
@Unique('uq_role_permissions_role_module', ['role', 'appModule'])
export class RolePermission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'boolean', default: false })
  r!: boolean;

  @Column({ type: 'boolean', default: false })
  w!: boolean;

  @Column({ type: 'boolean', default: false })
  u!: boolean;

  @Column({ type: 'boolean', default: false })
  d!: boolean;

  @ManyToOne(() => Role, (role) => role.role_permissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role!: Role;

  @ManyToOne(() => AppModuleEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'app_module_id' })
  appModule!: AppModuleEntity;
}
