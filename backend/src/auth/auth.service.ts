import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt/dist/jwt.service';

@Injectable()
export class AuthService {

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) { }

  async register(dto: any) {

    const exists =
      await this.prisma.user.findUnique({

        where: {

          email: dto.email,

        },

      });

    if (exists) {

      throw new BadRequestException(
        'El correo ya existe.',
      );

    }

    const password =
      await bcrypt.hash(
        dto.password,
        10,
      );

    const user =
      await this.prisma.user.create({

        data: {

          name: dto.name,

          email: dto.email,

          password,

        },

      });

    return {

      id: user.id,

      name: user.name,

      email: user.email,

    };

  }

  async login(dto: any) {

    const user =
      await this.prisma.user.findUnique({

        where: {
          email: dto.email,
        },

      });

    if (!user) {

      throw new BadRequestException(
        'Correo o contraseña incorrectos.',
      );

    }

    const validPassword =
      await bcrypt.compare(
        dto.password,
        user.password,
      );

    if (!validPassword) {

      throw new BadRequestException(
        'Correo o contraseña incorrectos.',
      );

    }

    const payload = {

      sub: user.id,

      email: user.email,

      name: user.name,

    };

    return {

      access_token:
        await this.jwtService.signAsync(payload),

    };



  }
  async resetPassword(email: string, password: string) {

    const hash = await bcrypt.hash(password, 10);

    await this.prisma.user.update({

      where: {
        email,
      },

      data: {
        password: hash,
      },

    });

    return {
      success: true,
    };

  }

}