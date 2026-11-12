import { applyDecorators, ValidationPipe } from '@nestjs/common';
import { IsOptional, IsString, Matches, MaxLength, NotContains } from 'class-validator';

const MAX_FILTER_LENGTH = 200;

export const queryFiltersPipe = new ValidationPipe({ transform: true, whitelist: true });

export function OptionalQueryText() {
  return applyDecorators(
    IsOptional(),
    IsString({ message: '$property debe ser un solo valor de texto.' }),
    MaxLength(MAX_FILTER_LENGTH, { message: '$property admite hasta $constraint1 caracteres.' }),
    NotContains('\0', { message: '$property contiene un carácter nulo.' }),
  );
}

export function OptionalQueryYear() {
  return applyDecorators(
    IsOptional(),
    Matches(/^[0-9]{4}$/, { message: 'year debe ser un año de cuatro dígitos.' }),
  );
}

export class TerritoryQueryDto {
  @OptionalQueryText() province?: string;
  @OptionalQueryText() canton?: string;
}

export class YearQueryDto {
  @OptionalQueryYear() year?: string;
}
