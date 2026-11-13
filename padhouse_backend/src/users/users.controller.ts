import { Controller, Get, Patch, Body, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private prisma: PrismaService) {}

  @ApiOperation({ summary: 'استرجاع الملف الشخصي للعميل الحالي وعناوينه' })
  @Get('profile')
  async getProfile(@CurrentUser('id') userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        createdAt: true,
        customerProfile: {
          include: {
            addresses: true,
          },
        },
      },
    });
  }

  @ApiOperation({ summary: 'قائمة المستخدمين (خاص بالإدارة)' })
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get()
  async listUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @ApiOperation({ summary: 'تحديث بيانات المستخدم' })
  @Patch('profile')
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() body: { fullName?: string; phone?: string },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: body.fullName,
        phone: body.phone,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
      },
    });
  }
}

