import {
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { PasswordRecoveryService } from './password-recovery.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

import {
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Authentication')
@UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController {

  constructor(
    private readonly authService: AuthService,
    private readonly passwordRecovery: PasswordRecoveryService,
  ) { }

  @ApiOperation({
    summary: 'Registrar usuario',
  })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('register')
  register(
    @Body() dto: RegisterDto,
  ) {
    return this.authService.register(dto);
  }

  @ApiOperation({
    summary: 'Iniciar sesión',
  })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  login(
    @Body() dto: LoginDto,
  ) {
    return this.authService.login(dto);
  }

  @ApiOperation({ summary: 'Solicitar recuperación de contraseña' })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.passwordRecovery.requestReset(dto.email);
  }

  @ApiOperation({ summary: 'Establecer contraseña mediante token temporal' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordRecovery.confirmReset(dto.token, dto.password);
  }

}