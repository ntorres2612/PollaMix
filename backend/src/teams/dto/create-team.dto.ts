import {
  IsInt,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class CreateTeamDto {
  @IsInt()
  id!: number;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  shortName!: string;

  @IsString()
  @IsNotEmpty()
  logo!: string;

  @IsInt()
  leagueId!: number;
}