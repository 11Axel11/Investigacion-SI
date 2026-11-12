import { OptionalQueryText, OptionalQueryYear, TerritoryQueryDto } from '../common/query-filters';

export class OijOverviewQueryDto extends TerritoryQueryDto {
  @OptionalQueryYear() year?: string;
  @OptionalQueryText() district?: string;
  @OptionalQueryText() crime?: string;
  @OptionalQueryText() modality?: string;
  @OptionalQueryText() targetCategory?: string;
  @OptionalQueryText() targetType?: string;
}
