import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class OijDataset {
  @PrimaryColumn('integer') year: number;
  @Column() sourceUrl: string;
  @Column({ type: 'timestamptz' }) fetchedAt: Date;
  @Column() firstDate: string;
  @Column() lastDate: string;
  @Column('integer') total: number;
  @Column('jsonb') groups: Array<{ province: string; canton: string; crime: string; month: string; count: number }>;
}
