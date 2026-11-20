import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

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
