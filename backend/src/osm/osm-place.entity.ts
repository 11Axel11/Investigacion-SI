import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

// Esta entidad guarda solo campos normalizados de objetos públicos de OSM.
@Entity()
@Unique(['osmType', 'osmId', 'province', 'canton'])
export class OsmPlace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  osmType: string;

  @Column('bigint')
  osmId: string;

  @Index()
  @Column({ default: '' })
  province: string;

  @Index()
  @Column({ default: '' })
  canton: string;

  @Index()
  @Column()
  category: string;

  @Index()
  @Column()
  name: string;

  @Column('double precision')
  latitude: number;

  @Column('double precision')
  longitude: number;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  website?: string;

  @Column({ type: 'timestamptz', nullable: true })
  sourceUpdatedAt?: Date;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  syncedAt: Date;
}
