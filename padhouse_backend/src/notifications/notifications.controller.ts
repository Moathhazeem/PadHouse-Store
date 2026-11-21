import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Admin Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
@Controller('admin/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOperation({ summary: 'جلب جميع إشعارات الإدارة مرتبة من الأحدث إلى الأقدم مع عدد غير المقروء' })
  @ApiResponse({ status: 200, description: 'قائمة الإشعارات مع unreadCount' })
  @Get()
  async getNotifications() {
    return this.notificationsService.findAll();
  }

  @ApiOperation({ summary: 'بث إشعار جماعي لجميع العملاء (عروض/خصومات/تنبيهات)' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الإشعار الجماعي' })
  @Post('broadcast')
  @HttpCode(HttpStatus.CREATED)
  async broadcast(@Body() dto: BroadcastNotificationDto) {
    return this.notificationsService.createBroadcast({
      title: dto.title,
      message: dto.message,
      type: dto.type || 'PROMOTION',
      metadata: dto.metadata,
      isUrgentCrisis: dto.isUrgentCrisis ?? false,
    });
  }

  @ApiOperation({ summary: 'تحديد جميع الإشعارات كمقروءة' })
  @ApiResponse({ status: 200, description: 'تم تحديث جميع الإشعارات كمقروءة' })
  @Patch('read-all')
  async markAllAsRead() {
    return this.notificationsService.markAllAsRead();
  }

  @ApiOperation({ summary: 'تحديد إشعار محدد كمقروء' })
  @ApiResponse({ status: 200, description: 'تم تحديث حالة الإشعار بنجاح' })
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }
}

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class UserNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOperation({ summary: 'إشعارات العميل الحالي (تقدّم الطلب وحالات الطوارئ)' })
  @ApiResponse({ status: 200, description: 'قائمة إشعارات العميل مع عدد غير المقروء' })
  @Get('my')
  async getMyNotifications(@CurrentUser('id') userId: string) {
    return this.notificationsService.findForUser(userId);
  }

  @ApiOperation({ summary: 'تحديد جميع إشعارات العميل كمقروءة' })
  @Patch('my/read-all')
  async markAllMyNotificationsAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllUserAsRead(userId);
  }

  @ApiOperation({ summary: 'تحديد إشعار العميل المحدد كمقروء' })
  @Patch('my/:id/read')
  async markMyNotificationAsRead(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markUserAsRead(id, userId);
  }
}
