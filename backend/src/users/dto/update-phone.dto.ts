import { IsString, Matches } from 'class-validator';

export class UpdatePhoneDto {
  @IsString()
  @Matches(/^\+573\d{9}$/, {
    message: 'Ingresa un celular colombiano válido con prefijo +57.',
  })
  phone!: string;
}
