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
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'El celular debe incluir el indicativo internacional, por ejemplo +57 300 123 4567.',
  })
  phone!: string;

  @IsBoolean()
  @Equals(true, {
    message: 'Debes aceptar el reglamento vigente.',
  })
  acceptRules!: boolean;

}