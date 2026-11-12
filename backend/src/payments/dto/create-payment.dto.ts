
import { IsInt, IsOptional, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsInt()
  @Min(1)
  tournamentId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  entryId?: number;
}
