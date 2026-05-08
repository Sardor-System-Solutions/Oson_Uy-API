import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../common/guards/admin.guard';
import { DeveloperAuthGuard } from '../common/guards/developer-auth.guard';
import { AdminCreatePromoDto } from './dto/admin-create-promo.dto';
import { RedeemPromoDto } from './dto/redeem-promo.dto';
import { PromoService } from './promo.service';

@ApiTags('promo')
@Controller('promo')
export class PromoController {
  constructor(private readonly promoService: PromoService) {}

  @Post('redeem')
  @UseGuards(DeveloperAuthGuard)
  @ApiOperation({ summary: 'Redeem promo code for a project' })
  redeem(@Body() dto: RedeemPromoDto, @Req() request: Request & { developerId?: number }) {
    return this.promoService.redeem(dto.code, dto.projectId, request.developerId);
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  @Get('admin/codes')
  @UseGuards(AdminGuard)
  @ApiHeader({ name: 'x-admin-key', required: true })
  @ApiOperation({ summary: '[Admin] List promo codes' })
  adminList() {
    return this.promoService.adminList();
  }

  @Post('admin/codes')
  @UseGuards(AdminGuard)
  @ApiHeader({ name: 'x-admin-key', required: true })
  @ApiOperation({ summary: '[Admin] Create promo code' })
  adminCreate(@Body() dto: AdminCreatePromoDto) {
    return this.promoService.adminCreate({
      ...dto,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });
  }

  @Patch('admin/codes/:id/active')
  @UseGuards(AdminGuard)
  @ApiHeader({ name: 'x-admin-key', required: true })
  @ApiOperation({ summary: '[Admin] Enable/disable promo code' })
  @ApiResponse({ status: 200 })
  adminSetActive(@Param('id', ParseIntPipe) id: number, @Body() body: { active: boolean }) {
    return this.promoService.adminSetActive(id, Boolean(body.active));
  }
}

