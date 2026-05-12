import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { ApartmentsModule } from '../apartments/apartments.module';
import { CustomerAuthModule } from '../customer-auth/customer-auth.module';
import { DeveloperAuthGuard } from '../common/guards/developer-auth.guard';
import { ProjectMemberGuard } from '../common/guards/project-member.guard';
import { ProjectUltimatePlanGuard } from '../common/guards/project-ultimate-plan.guard';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { CustomerCabinetController } from './customer-cabinet.controller';

@Module({
  imports: [AuthModule, ApartmentsModule, CustomerAuthModule],
  controllers: [CustomersController, CustomerCabinetController],
  providers: [
    CustomersService,
    PrismaService,
    DeveloperAuthGuard,
    ProjectMemberGuard,
    ProjectUltimatePlanGuard,
  ],
})
export class CustomersModule {}
