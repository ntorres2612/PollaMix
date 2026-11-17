import { IsString, Matches } from 'class-validator';

export class UpdatePhoneDto {
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'Ingresa el celular con indicativo internacional, por ejemplo +57 300 123 4567.',
  })
  phone!: string;
}
