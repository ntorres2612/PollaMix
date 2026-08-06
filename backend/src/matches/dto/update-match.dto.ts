import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
} from 'class-validator';

export class UpdateMatchDto {

  @IsOptional()
  @IsInt()
  apiId?: number;

  @IsOptional()
  @IsInt()
  leagueId?: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsInt()
  homeTeamId?: number;

  @IsOptional()
  @IsInt()
  awayTeamId?: number;

  @IsOptional()
  @IsInt()
  matchdayId?: number;

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