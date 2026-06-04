import { z } from 'zod';

export const EmailSchema = z.string().trim().toLowerCase().email();
export const PasswordSchema = z
  .string()
  .min(8, { message: 'auth.password.tooShort' })
  .max(128, { message: 'auth.password.tooLong' });

export const RegisterSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  displayName: z.string().trim().min(1).max(120),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const RefreshSchema = z.object({
  refreshToken: z.string().min(20).optional(),
});
export type RefreshInput = z.infer<typeof RefreshSchema>;

export const VerifyEmailSchema = z.object({
  token: z.string().min(20),
});
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;

export const ResendVerificationSchema = z.object({
  email: EmailSchema,
});
export type ResendVerificationInput = z.infer<typeof ResendVerificationSchema>;

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: PasswordSchema,
});
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

export const RegisterResultSchema = z.object({
  status: z.literal('pending_verification'),
  email: z.string().email(),
});
export type RegisterResult = z.infer<typeof RegisterResultSchema>;

export const TokensSchema = z.object({
  accessToken: z.string(),
  accessTokenExpiresAt: z.string(),
});
export type Tokens = z.infer<typeof TokensSchema>;

export const AuthMeSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  roles: z.array(z.enum(['PLAYER', 'COACH', 'PARENT', 'ACADEMY_ADMIN', 'SYSTEM_ADMIN'])),
});
export type AuthMe = z.infer<typeof AuthMeSchema>;

export const AuthSessionSchema = z.object({
  user: AuthMeSchema,
  tokens: TokensSchema,
});
export type AuthSession = z.infer<typeof AuthSessionSchema>;
