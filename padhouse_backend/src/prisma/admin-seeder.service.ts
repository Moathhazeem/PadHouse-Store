import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from './prisma.service';

@Injectable()
export class AdminSeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminSeederService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    await this.seedAdminUser();
  }

  /**
   * Idempotently seeds or updates the required default admin account:
   * Email: admin@gmail.com
   * Password: 123456789 (hashed with bcrypt matching existing project setup)
   * Role: ADMIN
   */
  async seedAdminUser(): Promise<void> {
    const adminEmail = 'admin@gmail.com';
    const rawPassword = '123456789';

    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: adminEmail },
      });

      const passwordHash = await bcrypt.hash(rawPassword, 10);

      if (!existingUser) {
        await this.prisma.user.create({
          data: {
            email: adminEmail,
            passwordHash,
            fullName: 'مسؤول المتجر (Admin)',
            phone: '+970599000000',
            role: 'ADMIN',
            isActive: true,
            customerProfile: {
              create: {
                preferredLocale: 'ar',
                cart: { create: {} },
              },
            },
          },
        });
        this.logger.log(`[AdminSeeder] Idempotent seed created default admin: ${adminEmail}`);
      } else {
        const matchesExisting = await bcrypt.compare(rawPassword, existingUser.passwordHash);
        await this.prisma.user.update({
          where: { email: adminEmail },
          data: {
            role: 'ADMIN',
            isActive: true,
            ...(matchesExisting ? {} : { passwordHash }),
          },
        });
        this.logger.log(`[AdminSeeder] Idempotent seed verified default admin: ${adminEmail} (role: ADMIN)`);
      }
    } catch (error: any) {
      this.logger.warn(`[AdminSeeder] Note on startup seeding: ${error?.message || error}`);
    }
  }
}
