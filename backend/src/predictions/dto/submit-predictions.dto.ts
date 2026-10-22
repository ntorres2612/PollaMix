import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

export class SubmitPredictionItemDto {
  @IsInt()
  @Min(1)
  matchId!: number;

  @IsIn(['HOME', 'DRAW', 'AWAY'])
  selection!: 'HOME' | 'DRAW' | 'AWAY';
}

export class SubmitPredictionsDto {
  @IsInt()
  @Min(1)
  tournamentId!: number;

  @IsArray()
  @ArrayMinSize(10)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => SubmitPredictionItemDto)
  predictions!: SubmitPredictionItemDto[];
}
