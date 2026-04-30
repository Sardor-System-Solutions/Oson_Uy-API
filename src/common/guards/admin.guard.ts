import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const secret = process.env.ADMIN_SECRET;
    if (!secret) {
      throw new UnauthorizedException('ADMIN_SECRET is not configured');
    }
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers['x-admin-key'] as string | undefined;
    if (!provided || provided !== secret) {
      throw new UnauthorizedException('Invalid admin key');
    }
    return true;
  }
}
