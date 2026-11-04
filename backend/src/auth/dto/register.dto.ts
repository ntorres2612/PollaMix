import {
  IsEmail,
  IsBoolean,
  Equals,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';

export class RegisterDto {

  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @Matches(/^\+573\d{9}$/, {
    message: 'El celular debe ser un número móvil colombiano válido.',
  })
  phone!: string;

  @IsBoolean()
  @Equals(true, {
    message: 'Debes aceptar el reglamento vigente.',
  })
  acceptRules!: boolean;

}