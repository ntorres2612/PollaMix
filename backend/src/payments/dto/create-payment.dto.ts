import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePaymentDto {

  @IsInt()
  tournamentId!: number;

  @IsOptional()
  @IsInt()
  participantId?: number;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsString()
  reference!: string;

  @IsOptional()
  @IsString()
  method?: string;
}