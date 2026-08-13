import { IsString } from 'class-validator';

export class UpdatePaymentStatusDto {

  @IsString()
  status!: string;
}