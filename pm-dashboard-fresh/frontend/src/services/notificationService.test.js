// frontend/src/services/notificationService.test.js
import notificationService, { NotificationService } from './notificationService';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock Notification API
global.Notification = {
  permission: 'default',
  requestPermission: jest.fn().mockResolvedValue('granted'),
};

// Mock setTimeout and setInterval
jest.useFakeTimers();

describe('NotificationService', () => {
  let notificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
    // Create a new instance for each test to avoid singleton issues
    notificationService = new NotificationService();
  });

  describe('constructor and preferences', () => {
    it('loads default preferences when no saved preferences', () => {
      localStorageMock.getItem.mockReturnValue(null);

      // Create a new instance to test constructor
      const newService = new notificationService.constructor();

      expect(newService.preferences).toEqual({
        emailNotifications: true,
        pushNotifications: true,
        projectUpdates: true,
        weeklyDigest: false
      });
    });

    it('loads saved preferences from localStorage', () => {
      const savedPrefs = {
        emailNotifications: false,
        pushNotifications: true,
        projectUpdates: false,
        weeklyDigest: true
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedPrefs));

      const newService = new notificationService.constructor();

      expect(newService.preferences).toEqual(savedPrefs);
    });

    it('handles invalid JSON in localStorage gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const newService = new notificationService.constructor();

      expect(newService.preferences).toEqual({
        emailNotifications: true,
        pushNotifications: true,
        projectUpdates: true,
        weeklyDigest: false
      });

      consoleSpy.mockRestore();
    });
  });

  describe('updatePreferences', () => {
    it('updates preferences and saves to localStorage', () => {
      const newPrefs = {
        emailNotifications: false,
        pushNotifications: false
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        emailNotifications: true,
        pushNotifications: true,
        projectUpdates: true,
        weeklyDigest: false
      }));

      notificationService.updatePreferences(newPrefs);

      expect(notificationService.preferences).toEqual({
        emailNotifications: false,
        pushNotifications: false,
        projectUpdates: true,
        weeklyDigest: false
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'userPreferences',
        JSON.stringify({
          emailNotifications: false,
          pushNotifications: false,
          projectUpdates: true,
          weeklyDigest: false
        })
      );
    });
  });

  describe('requestPushPermission', () => {
    it('returns true when permission is already granted', async () => {
      global.Notification.permission = 'granted';

      const result = await notificationService.requestPushPermission();
      expect(result).toBe(true);
      expect(global.Notification.requestPermission).not.toHaveBeenCalled();
    });

    it('returns false when permission is denied', async () => {
      global.Notification.permission = 'denied';

      const result = await notificationService.requestPushPermission();
      expect(result).toBe(false);
    });

    it('requests permission when default', async () => {
      global.Notification.permission = 'default';
      global.Notification.requestPermission.mockResolvedValue('granted');

      const result = await notificationService.requestPushPermission();
      expect(result).toBe(true);
      expect(global.Notification.requestPermission).toHaveBeenCalled();
    });

    it('handles permission request failure', async () => {
      global.Notification.permission = 'default';
      global.Notification.requestPermission.mockRejectedValue(new Error('Failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = await notificationService.requestPushPermission();

      expect(result).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe('sendPushNotification', () => {
    beforeEach(() => {
      notificationService.preferences.pushNotifications = true;
      global.Notification.permission = 'granted';
    });

    it('does not send notification when push notifications are disabled', async () => {
      notificationService.preferences.pushNotifications = false;

      await notificationService.sendPushNotification('Test');

      expect(global.Notification).not.toHaveBeenCalled();
    });

    it('shows alert when Notification API is not supported', async () => {
      const originalNotification = global.Notification;
      delete global.Notification;
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      await notificationService.sendPushNotification('Test', { body: 'Message' });

      expect(alertSpy).toHaveBeenCalledWith('Test: Message');
      alertSpy.mockRestore();
      global.Notification = originalNotification;
    });

    it('creates notification with correct options', async () => {
      const mockNotification = {
        close: jest.fn(),
        onclick: null
      };
      global.Notification = jest.fn().mockImplementation(() => mockNotification);

      await notificationService.sendPushNotification('Test Title', {
        body: 'Test Body',
        icon: 'test-icon.png',
        requireInteraction: true,
        onClick: jest.fn()
      });

      expect(global.Notification).toHaveBeenCalledWith('Test Title', {
        body: 'Test Body',
        icon: 'test-icon.png',
        badge: 'test-icon.png',
        tag: 'app-notification',
        requireInteraction: true,
        onClick: expect.any(Function)
      });

      // Test auto-close
      jest.advanceTimersByTime(5000);
      expect(mockNotification.close).toHaveBeenCalled();
    });

    it('handles notification creation error', async () => {
      global.Notification = jest.fn().mockImplementation(() => {
        throw new Error('Notification failed');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await notificationService.sendPushNotification('Test');

      expect(consoleSpy).toHaveBeenCalledWith('Error sending push notification:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('sendEmailNotification', () => {
    it('does not send email when email notifications are disabled', () => {
      notificationService.preferences.emailNotifications = false;

      notificationService.sendEmailNotification('Subject', 'Body', 'test@example.com');

      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('sends email and stores in log', () => {
      notificationService.preferences.emailNotifications = true;

      notificationService.sendEmailNotification('Test Subject', 'Test Body', 'test@example.com');

      expect(localStorageMock.setItem).toHaveBeenCalledWith('emailLog', expect.any(String));

      const loggedEmails = notificationService.getEmailLog();
      expect(loggedEmails).toHaveLength(1);
      expect(loggedEmails[0]).toMatchObject({
        subject: 'Test Subject',
        body: 'Test Body',
        recipient: 'test@example.com',
        read: false
      });
    });
  });

  describe('notifyProjectUpdate', () => {
    const mockProject = { id: 1, name: 'Test Project' };

    beforeEach(() => {
      notificationService.preferences.projectUpdates = true;
      global.Notification = jest.fn().mockImplementation(() => ({
        close: jest.fn(),
        onclick: null
      }));
    });

    it('sends both push and email notifications', async () => {
      const setItemSpy = jest.spyOn(localStorageMock, 'setItem');

      await notificationService.notifyProjectUpdate(mockProject, 'progress', { progress: 75 });

      expect(global.Notification).toHaveBeenCalledWith('Project Update: Test Project', expect.any(Object));
      expect(setItemSpy).toHaveBeenCalledWith('emailLog', expect.any(String));
    });

    it('generates correct update messages', async () => {
      const testCases = [
        ['progress', { progress: 50 }, 'Progress updated to 50%'],
        ['status', { status: 'Completed' }, 'Status changed to Completed'],
        ['comment', { comment: 'This is a long comment that should be truncated' }, 'New comment: This is a long comment that should be truncated...'],
        ['unknown', {}, 'Project updated: unknown']
      ];

      for (const [updateType, details, expectedMessage] of testCases) {
        global.Notification = jest.fn().mockImplementation(() => ({
          close: jest.fn(),
          onclick: null
        }));

        await notificationService.notifyProjectUpdate(mockProject, updateType, details);

        expect(global.Notification).toHaveBeenCalledWith(
          'Project Update: Test Project',
          expect.objectContaining({ body: expectedMessage })
        );
      }
    });
  });

  describe('getEmailLog', () => {
    it('returns empty array when no emails logged', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const emails = notificationService.getEmailLog();
      expect(emails).toEqual([]);
    });

    it('returns parsed email log', () => {
      const emailLog = [{ id: 1, subject: 'Test' }];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(emailLog));

      const emails = notificationService.getEmailLog();
      expect(emails).toEqual(emailLog);
    });
  });

  describe('getLocalizedMessage', () => {
    it('returns English message by default', () => {
      const message = notificationService.getLocalizedMessage('projectUpdated');
      expect(message).toBe('Project updated');
    });

    it('returns message in specified language', () => {
      const message = notificationService.getLocalizedMessage('projectUpdated', 'es');
      expect(message).toBe('Proyecto actualizado');
    });

    it('falls back to English for unknown language', () => {
      const message = notificationService.getLocalizedMessage('projectUpdated', 'unknown');
      expect(message).toBe('Project updated');
    });

    it('returns key if message not found', () => {
      const message = notificationService.getLocalizedMessage('unknownKey');
      expect(message).toBe('unknownKey');
    });
  });

  describe('formatDateForTimezone', () => {
    it('formats date correctly', () => {
      const date = new Date('2023-12-25T12:00:00Z');
      const formatted = notificationService.formatDateForTimezone(date, 'America/New_York');

      // Should contain date and time
      expect(formatted).toMatch(/Dec \d+, \d+/);
    });

    it('handles invalid timezone gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const date = new Date('2023-12-25T12:00:00Z');

      const formatted = notificationService.formatDateForTimezone(date, 'Invalid/Timezone');

      expect(typeof formatted).toBe('string');
      consoleSpy.mockRestore();
    });
  });
});