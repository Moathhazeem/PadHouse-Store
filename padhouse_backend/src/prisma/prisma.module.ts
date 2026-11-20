import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AdminSeederService } from './admin-seeder.service';

@Global()
@Module({
  providers: [PrismaService, AdminSeederService],
  exports: [PrismaService, AdminSeederService],
})
export class PrismaModule {}


