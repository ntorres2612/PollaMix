import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import { AuthService } from './auth.service';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

import {
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {

  constructor(
    private readonly authService: AuthService,
  ) { }

  @ApiOperation({
    summary: 'Registrar usuario',
  })
  @Post('register')
  register(
    @Body() dto: RegisterDto,
  ) {
    return this.authService.register(dto);
  }

  @ApiOperation({
    summary: 'Iniciar sesión',
  })
  @Post('login')
  login(
    @Body() dto: LoginDto,
  ) {
    return this.authService.login(dto);
  }

  @Post('reset-password')
  resetPassword(
    @Body() body: any,
  ) {
    return this.authService.resetPassword(
      body.email,
      body.password,
    );
  }

}