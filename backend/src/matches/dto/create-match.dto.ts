import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
} from 'class-validator';

export class CreateMatchDto {

  @IsInt()
  apiId!: number;

  @IsInt()
  leagueId!: number;

  @IsDateString()
  date!: string;

  @IsInt()
  homeTeamId!: number;

  @IsInt()
  awayTeamId!: number;

  @IsInt()
  matchdayId!: number;

  @IsOptional()
  @IsInt()
  homeScore?: number;

  @IsOptional()
  @IsInt()
  awayScore?: number;

  @IsOptional()
  @IsBoolean()
  finished?: boolean;

}