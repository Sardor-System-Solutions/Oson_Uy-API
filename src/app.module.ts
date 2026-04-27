import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PrismaService } from './prisma.service';
import { DevelopersModule } from './developers/developers.module';
import { ProjectsModule } from './projects/projects.module';
import { ApartmentsModule } from './apartments/apartments.module';
import { LeadsModule } from './leads/leads.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { MediaModule } from './media/media.module';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { DeveloperAuthGuard } from './common/guards/developer-auth.guard';
import { ProjectMemberGuard } from './common/guards/project-member.guard';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 100,
        },
      ],
    }),
    DevelopersModule,
    ProjectsModule,
    ApartmentsModule,
    LeadsModule,
    AnalyticsModule,
    MediaModule,
    AuthModule,
    BillingModule,
  ],
  providers: [
    PrismaService,
    DeveloperAuthGuard,
    ProjectMemberGuard,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
