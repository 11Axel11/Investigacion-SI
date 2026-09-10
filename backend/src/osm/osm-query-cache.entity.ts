import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class OsmQueryCache {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  queryKey: string;

  @Column()
  category: string;

  @Column({ default: '' })
  province: string;

  @Column({ default: '' })
  canton: string;

  @Column('double precision', { default: 9.9281 })
  centerLatitude: number;

  @Column('double precision', { default: -84.0907 })
  centerLongitude: number;

  @Column({ type: 'timestamptz', nullable: true })
  sourceUpdatedAt?: Date;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  fetchedAt: Date;
}
