import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';
import { z } from 'zod';
import { ENV, Env } from '../config/env';
import { RegistryService } from '../registry/registry.service';
import { renderEmail } from './email-template';

export const sendEmailInput = z.object({
  to: z.string().email().optional(),
  subject: z.string().min(1).max(200),
  markdown: z.string().min(1),
  actions: z
    .array(z.object({ label: z.string().min(1), url: z.string().url(), style: z.enum(['primary', 'danger', 'default']).optional() }))
    .max(5)
    .default([]),
  attachments: z
    .array(z.object({ filename: z.string().min(1), contentBase64: z.string().min(1), contentType: z.string().optional() }))
    .max(3)
    .default([]),
});
export type SendEmailInput = z.infer<typeof sendEmailInput>;

@Injectable()
export class MailService {
  private readonly transport: Transporter;

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly registry: RegistryService,
  ) {
    this.transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }

  /** Sends to `to`, or to the address configured on the email notifier. */
  async send(input: SendEmailInput): Promise<{ messageId: string; to: string }> {
    const to = input.to ?? (await this.defaultRecipient());
    if (!to) throw new BadRequestException('No recipient: pass "to" or set config.to on the email notifier');
    const { subject, html, text } = renderEmail(input);
    const info = await this.transport.sendMail({
      from: this.env.MAIL_FROM,
      to,
      subject,
      html,
      text,
      attachments: input.attachments.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.contentBase64, 'base64'),
        contentType: a.contentType,
      })),
    });
    return { messageId: info.messageId, to };
  }

  private async defaultRecipient(): Promise<string | undefined> {
    const [email] = (await this.registry.notifiers(false)).filter((n) => n.key === 'email');
    const to = (email?.config as { to?: unknown } | undefined)?.to;
    return typeof to === 'string' ? to : undefined;
  }
}
