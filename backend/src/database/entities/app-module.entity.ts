import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('app_modules')
export class AppModuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 50, unique: true })
  code!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ length: 500, default: '' })
  description!: string;

  @Column({ name: 'route_path', type: 'varchar', length: 200, nullable: true })
  routePath!: string | null;

  @Column({ name: 'nav_sort_order', type: 'int', default: 0 })
  navSortOrder!: number;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem!: boolean;
}
