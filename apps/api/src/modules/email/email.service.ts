import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export type SendOptions = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private initialized = false;

  constructor(private readonly config: ConfigService) {}

  /** Lazily builds the SMTP transport. Returns null when SMTP is not configured. */
  private getTransport(): Transporter | null {
    if (this.initialized) return this.transporter;
    this.initialized = true;
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    if (!host) {
      this.transporter = null;
      return null;
    }
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASS');
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      ...(user ? { auth: { user, pass: pass ?? '' } } : {}),
    });
    return this.transporter;
  }

  private from(): string {
    return (
      this.config.get<string>('SMTP_FROM')?.trim() ||
      'Snooker Player OS <no-reply@localhost>'
    );
  }

  async send(options: SendOptions): Promise<void> {
    const transport = this.getTransport();
    if (!transport) {
      // Dev fallback: no SMTP configured — surface the message in the logs so
      // local flows (e.g. email verification) remain usable without a mail server.
      this.logger.warn(
        `[email:dev] SMTP not configured. Would send to ${options.to}: "${options.subject}"\n${options.text}`,
      );
      return;
    }
    await transport.sendMail({
      from: this.from(),
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
  }

  async sendEmailVerification(to: string, displayName: string, verifyUrl: string): Promise<void> {
    const subject = 'Подтвердите ваш email — Snooker Player OS';
    const text =
      `Здравствуйте, ${displayName}!\n\n` +
      `Подтвердите регистрацию в Snooker Player OS, перейдя по ссылке:\n${verifyUrl}\n\n` +
      `Ссылка действительна 24 часа. Если вы не создавали аккаунт, проигнорируйте это письмо.`;
    const html =
      `<p>Здравствуйте, ${escapeHtml(displayName)}!</p>` +
      `<p>Подтвердите регистрацию в Snooker Player OS:</p>` +
      `<p><a href="${escapeAttr(verifyUrl)}">Подтвердить email</a></p>` +
      `<p>Ссылка действительна 24 часа. Если вы не создавали аккаунт, проигнорируйте это письмо.</p>`;
    await this.send({ to, subject, html, text });
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;',
  );
}

function escapeAttr(value: string): string {
  return value.replace(/"/g, '&quot;');
}
