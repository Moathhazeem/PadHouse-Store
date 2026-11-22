import { Test, TestingModule } from '@nestjs/testing';
import {
  NotificationsService,
  USER_NOTIFICATION_TYPES,
} from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      notification: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('findAll', () => {
    it('should return admin notifications newest first along with unread count', async () => {
      const mockNotifications = [
        { id: '1', title: 'Low Stock', createdAt: new Date() },
        { id: '2', title: 'Low Stock 2', createdAt: new Date() },
      ];
      prisma.notification.findMany.mockResolvedValue(mockNotifications);
      prisma.notification.count.mockResolvedValue(1);

      const result = await service.findAll();

      // The admin console list is scoped to global (userId = null) notifications
      // that are not customer-facing (excludes USER_NOTIFICATION_TYPES).
      const expectedWhere = {
        userId: null,
        type: { notIn: [...USER_NOTIFICATION_TYPES] },
      };

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: expectedWhere,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { ...expectedWhere, isRead: false },
      });
      expect(result).toEqual({
        notifications: mockNotifications,
        unreadCount: 1,
      });
    });
  });

  describe('markAsRead', () => {
    it('should update isRead to true for an existing notification', async () => {
      prisma.notification.findUnique.mockResolvedValue({ id: 'notif-1', isRead: false });
      prisma.notification.update.mockResolvedValue({ id: 'notif-1', isRead: true });

      const result = await service.markAsRead('notif-1');

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { isRead: true },
      });
      expect(result.isRead).toBe(true);
    });

    it('should throw NotFoundException if notification does not exist', async () => {
      prisma.notification.findUnique.mockResolvedValue(null);

      await expect(service.markAsRead('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAllAsRead', () => {
    it('should update all unread notifications to read', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead();

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { isRead: false },
        data: { isRead: true },
      });
      expect(result).toEqual({ success: true, updatedCount: 5 });
    });
  });

  describe('checkAndCreateLowStockNotification', () => {
    it('should NOT create notification if stock >= minStock', async () => {
      const result = await service.checkAndCreateLowStockNotification({
        productId: 'prod-1',
        productNameAr: 'شاحن',
        stock: 10,
        minStock: 5,
      });

      expect(result).toBeNull();
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('should create notification if stock < minStock and no unread alert exists', async () => {
      prisma.notification.findFirst.mockResolvedValue(null);
      prisma.notification.create.mockResolvedValue({
        id: 'new-notif',
        productId: 'prod-1',
        type: 'LOW_STOCK',
        isRead: false,
      });

      const result = await service.checkAndCreateLowStockNotification({
        productId: 'prod-1',
        productNameAr: 'شاحن',
        stock: 2,
        minStock: 5,
      });

      expect(prisma.notification.findFirst).toHaveBeenCalledWith({
        where: { productId: 'prod-1', type: 'LOW_STOCK', isRead: false },
      });
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'LOW_STOCK',
          productId: 'prod-1',
          isRead: false,
        }),
      });
      expect(result.id).toBe('new-notif');
    });

    it('should NOT create duplicate unread notification if one already exists', async () => {
      const existingNotif = {
        id: 'existing-unread',
        productId: 'prod-1',
        type: 'LOW_STOCK',
        isRead: false,
      };
      prisma.notification.findFirst.mockResolvedValue(existingNotif);

      const result = await service.checkAndCreateLowStockNotification({
        productId: 'prod-1',
        productNameAr: 'شاحن',
        stock: 1,
        minStock: 5,
      });

      expect(prisma.notification.create).not.toHaveBeenCalled();
      expect(result).toEqual(existingNotif);
    });

    it('should use transaction client tx when provided', async () => {
      const txMock: any = {
        notification: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'tx-notif' }),
        },
      };

      const result = await service.checkAndCreateLowStockNotification(
        {
          productId: 'prod-tx',
          productNameAr: 'كفر',
          stock: 0,
          minStock: 5,
        },
        txMock,
      );

      expect(txMock.notification.findFirst).toHaveBeenCalled();
      expect(txMock.notification.create).toHaveBeenCalled();
      expect(prisma.notification.findFirst).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'tx-notif' });
    });
  });
});
