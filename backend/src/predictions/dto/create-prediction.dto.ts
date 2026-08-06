import {
  IsInt,
  Min,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class CreatePredictionDto {

  @IsInt()
  userId!: number;

  @ApiProperty({
    example: 341,
  })
  matchId!: number;

  @ApiProperty({
    example: 2,
  })
  homeScore!: number;

   @ApiProperty({
    example: 1,
  })
  awayScore!: number;

}