import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

// Solo se guardan conteos agregados. No se persisten cédulas ni nombres.
@Entity()
export class TseElectoralSummary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 6 })
  electoralCode: string;

  @Index()
  @Column()
  province: string;

  @Index()
  @Column()
  canton: string;

  @Column()
  district: string;

  @Column('integer')
  electors: number;

  @Column('integer')
  pollingStations: number;

  @Column()
  sourceFile: string;

  @Column({ type: 'date', nullable: true })
  sourceDate?: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  importedAt: Date;
}
