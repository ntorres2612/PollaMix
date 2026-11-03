import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { createHmac, timingSafeEqual } from 'node:crypto';

import { PrismaService } from '../../prisma/prisma.service';

interface SessionPayload {
  sub: number;
  pwdv?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: SessionPayload) {
    if (
      !Number.isSafeInteger(payload?.sub) ||
      payload.sub <= 0 ||
      typeof payload.pwdv !== 'string' ||
      !/^[a-f0-9]{64}$/.test(payload.pwdv)
    ) {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    const expected = createHmac(
      'sha256',
      process.env.JWT_SECRET!,
    )
      .update('pollamix-session-v1:')
      .update(String(user.id))
      .update(':')
      .update(user.password)
      .digest('hex');

    const valid = timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(payload.pwdv, 'hex'),
    );

    if (!valid) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}
