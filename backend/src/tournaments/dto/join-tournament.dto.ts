import { IsInt } from 'class-validator';

export class JoinTournamentDto {

  @IsInt()
  userId!: number;

}