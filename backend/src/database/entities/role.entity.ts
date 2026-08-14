import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { RolePermission } from './role-permission.entity';
import { Usuario } from './usuario.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100, unique: true })
  name!: string;

  @Column({ length: 255, default: '' })
  description!: string;

  @OneToMany(() => Usuario, (usuario) => usuario.role)
  usuarios!: Usuario[];

  @OneToMany(() => RolePermission, (row) => row.role)
  role_permissions!: RolePermission[];
}
