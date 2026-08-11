import { IsInt, Min } from 'class-validator';

export class CreatePredictionDto {

  @IsInt()
  @Min(1)
  matchId!: number;

  @IsInt()
  @Min(1)
  tournamentId!: number;

  @IsInt()
  @Min(0)
  homeScore!: number;

  @IsInt()
  @Min(0)
  awayScore!: number;
}