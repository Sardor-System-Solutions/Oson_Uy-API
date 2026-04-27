import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { DeveloperAuthGuard } from '../common/guards/developer-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register developer account' })
  @ApiResponse({ status: 201, description: 'Registered and signed in' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.name, dto.email, dto.password);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login developer account' })
  @ApiResponse({ status: 200, description: 'Signed in successfully' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Get('me')
  @UseGuards(DeveloperAuthGuard)
  @ApiOperation({ summary: 'Get current developer profile' })
  @ApiResponse({ status: 200, description: 'Current developer profile' })
  me(@Req() request: Request & { developerId?: number }) {
    return { developerId: request.developerId };
  }

  @Post('logout')
  @UseGuards(DeveloperAuthGuard)
  @ApiOperation({ summary: 'Logout current developer session' })
  logout(@Req() request: Request) {
    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : '';
    return this.authService.logout(token);
  }
}
