import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredKey = process.env.ADMIN_API_KEY;
    if (!requiredKey) {
      throw new UnauthorizedException('Admin API key is not configured');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = request.headers['x-admin-key'];

    if (typeof providedKey === 'string' && providedKey === requiredKey) {
      return true;
    }

    throw new UnauthorizedException('Invalid admin API key');
  }
}
