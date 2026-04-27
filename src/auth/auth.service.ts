import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma.service';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(name: string, email: string, password: string) {
    const existing = await this.prisma.developer.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      throw new BadRequestException('Email is already registered');
    }

    const passwordHash = this.hashPassword(password);
    const developer = await this.prisma.developer.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
      },
    });

    const session = await this.createSession(developer.id);
    return {
      token: session.token,
      developer: {
        id: developer.id,
        name: developer.name,
        email: developer.email,
      },
    };
  }

  async login(email: string, password: string) {
    const developer = await this.prisma.developer.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!developer?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!this.verifyPassword(password, developer.passwordHash)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const session = await this.createSession(developer.id);
    return {
      token: session.token,
      developer: {
        id: developer.id,
        name: developer.name,
        email: developer.email,
      },
    };
  }

  async resolveDeveloperByToken(token: string) {
    const session = await this.prisma.developerSession.findUnique({
      where: { token },
      include: { developer: true },
    });
    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired');
    }
    return session.developer;
  }

  async logout(token: string) {
    await this.prisma.developerSession.deleteMany({
      where: { token },
    });
    return { ok: true };
  }

  private async createSession(developerId: number) {
    return this.prisma.developerSession.create({
      data: {
        developerId,
        token: randomBytes(32).toString('hex'),
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    });
  }

  private hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, stored: string) {
    const [salt, hash] = stored.split(':');
    const hashedBuffer = Buffer.from(hash, 'hex');
    const suppliedBuffer = scryptSync(password, salt, 64);
    return timingSafeEqual(hashedBuffer, suppliedBuffer);
  }
}
