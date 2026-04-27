import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../../auth/auth.service';

@Injectable()
export class DeveloperAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { developerId?: number }>();
    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : undefined;
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const developer = await this.authService.resolveDeveloperByToken(token);
    request.developerId = developer.id;
    return true;
  }
}
