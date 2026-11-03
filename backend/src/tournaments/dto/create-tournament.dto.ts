import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateTournamentDto {

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  leagueId!: number;

  @IsInt()
  season!: number;

  @IsNumber()
  @Min(0)
  inscription!: number;

  @IsOptional()
  @IsIn(['COP', 'USD'])
  currency?: 'COP' | 'USD';

  @IsNumber()
  @Min(0)
  prize!: number;

  @IsInt()
  @Min(2)
  maxPlayers!: number;

  @IsDateString()
  registrationStartsAt!: string;

  @IsDateString()
  registrationEndsAt!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;
}
