import type { ConfigService } from '@nestjs/config';

const sendMail = jest.fn();
const verify = jest.fn();
const createTransport = jest.fn(() => ({ sendMail, verify }));
const getTestMessageUrl = jest.fn();

jest.mock('nodemailer', () => ({
  createTransport: (...args: unknown[]) => createTransport(...args),
  getTestMessageUrl: (...args: unknown[]) => getTestMessageUrl(...args),
}));

import { MailService } from './mail.service';

function configWith(values: Record<string, unknown>): ConfigService {
  return {
    get: (key: string, fallback?: unknown) =>
      key in values ? values[key] : fallback,
  } as unknown as ConfigService;
}

describe('MailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when SMTP is not configured', () => {
    it('logs a warning and skips sending without throwing', async () => {
      const service = new MailService(configWith({ 'mail.host': '' }));
      await service.onModuleInit();

      const result = await service.send({
        to: 'dev@example.com',
        subject: 'Hi',
        html: '<p>hi</p>',
      });

      expect(result).toEqual({
        success: false,
        error: 'SMTP not configured',
      });
      expect(sendMail).not.toHaveBeenCalled();
    });
  });

  describe('when SMTP is configured', () => {
    const config = () =>
      configWith({
        'mail.host': 'smtp.ethereal.email',
        'mail.port': 587,
        'mail.secure': false,
        'mail.user': 'user',
        'mail.password': 'pass',
        'mail.from': 'Devlytics <no-reply@devlytics.local>',
        'mail.connectionTimeoutMs': 10_000,
      });

    it('verifies connectivity on module init and logs but does not throw on failure', async () => {
      verify.mockRejectedValue(new Error('ECONNREFUSED'));
      const service = new MailService(config());

      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });

    it('sends a rendered message and surfaces the messageId/previewUrl', async () => {
      sendMail.mockResolvedValue({ messageId: '<abc@ethereal>' });
      getTestMessageUrl.mockReturnValue('https://ethereal.email/message/abc');
      const service = new MailService(config());

      const result = await service.send({
        to: 'dev@example.com',
        subject: 'Hi',
        html: '<p>hi</p>',
        text: 'hi',
      });

      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'Devlytics <no-reply@devlytics.local>',
          to: 'dev@example.com',
          subject: 'Hi',
          html: '<p>hi</p>',
          text: 'hi',
        }),
      );
      expect(result).toEqual({
        success: true,
        messageId: '<abc@ethereal>',
        previewUrl: 'https://ethereal.email/message/abc',
      });
    });

    it('returns a failed result instead of throwing when sendMail rejects', async () => {
      sendMail.mockRejectedValue(new Error('550 rejected'));
      const service = new MailService(config());

      const result = await service.send({
        to: 'dev@example.com',
        subject: 'Hi',
        html: '<p>hi</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('550 rejected');
    });

    it('renders a template and sends it via sendTemplate', async () => {
      sendMail.mockResolvedValue({ messageId: '<xyz@ethereal>' });
      getTestMessageUrl.mockReturnValue(false);
      const service = new MailService(config());

      const result = await service.sendTemplate('dev@example.com', {
        subject: 'Weekly summary',
        bodyParagraphs: ['Here is your week.'],
        cta: { label: 'View', url: 'https://app.devlytics.local' },
      });

      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'dev@example.com',
          subject: 'Weekly summary',
          html: expect.stringContaining('Here is your week.'),
        }),
      );
      expect(result.success).toBe(true);
    });
  });
});
