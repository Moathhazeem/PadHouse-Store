import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new ConflictException('البريد الإلكتروني مسجل مسبقاً');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        fullName: dto.fullName.trim(),
        phone: dto.phone,
        role: 'CUSTOMER',
        customerProfile: {
          create: {
            preferredLocale: 'ar',
            cart: { create: {} },
            addresses: dto.city && dto.street ? {
              create: {
                city: dto.city,
                street: dto.street,
                phone: dto.phone || '',
                isDefault: true,
              },
            } : undefined,
          },
        },
      },
      include: {
        customerProfile: {
          include: { addresses: true },
        },
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        customerProfileId: user.customerProfile?.id,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: {
        customerProfile: {
          include: { addresses: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('الحساب غير نشط أو تم تعطيله');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        customerProfileId: user.customerProfile?.id,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    const record = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!record || record.isRevoked || new Date() > record.expiresAt) {
      throw new UnauthorizedException('جلسة التحديث منتهية الصلاحية أو غير صالحة');
    }

    if (!record.user || !record.user.isActive) {
      throw new UnauthorizedException('الحساب غير نشط أو تم تعطيله');
    }

    // Revoke old token (Rotation)
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { isRevoked: true },
    });

    return this.generateTokens(record.user.id, record.user.email, record.user.role);
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET') || 'padhouse_jwt_secret_min_32_characters_long_key_here_for_dev_session',
      expiresIn: '15m',
    });

    const jti = randomUUID();
    const refreshToken = this.jwtService.sign(
      { ...payload, jti },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'padhouse_refresh_token_secret_key_rotation_here_for_dev',
        expiresIn: '7d',
      },
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}

