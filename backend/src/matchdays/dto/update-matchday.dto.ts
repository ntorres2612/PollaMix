import { PartialType } from '@nestjs/mapped-types';
import { CreateMatchdayDto } from './create-matchday.dto';

export class UpdateMatchdayDto extends PartialType(CreateMatchdayDto) {}