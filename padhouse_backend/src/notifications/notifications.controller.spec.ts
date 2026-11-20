import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: any;

  beforeEach(async () => {
    service = {
      findAll: jest.fn().mockResolvedValue({ notifications: [], unreadCount: 0 }),
      markAsRead: jest.fn().mockResolvedValue({ id: '1', isRead: true }),
      markAllAsRead: jest.fn().mockResolvedValue({ success: true, updatedCount: 2 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: service },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  it('GET /admin/notifications should call service.findAll', async () => {
    const result = await controller.getNotifications();
    expect(service.findAll).toHaveBeenCalled();
    expect(result).toEqual({ notifications: [], unreadCount: 0 });
  });

  it('PATCH /admin/notifications/:id/read should call service.markAsRead', async () => {
    const result = await controller.markAsRead('1');
    expect(service.markAsRead).toHaveBeenCalledWith('1');
    expect(result).toEqual({ id: '1', isRead: true });
  });

  it('PATCH /admin/notifications/read-all should call service.markAllAsRead', async () => {
    const result = await controller.markAllAsRead();
    expect(service.markAllAsRead).toHaveBeenCalled();
    expect(result).toEqual({ success: true, updatedCount: 2 });
  });
});
