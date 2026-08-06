import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class CreateMatchdayDto {

  @IsInt()
  leagueId!: number;

  @IsInt()
  number!: number;

  @IsString()
  @IsNotEmpty()
  tournament!: string;

  @IsInt()
  season!: number;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsBoolean()
  active!: boolean;

}