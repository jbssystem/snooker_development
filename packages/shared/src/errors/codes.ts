/**
 * Stable error codes returned by the API in `{ error: { code } }`.
 * The web translates them via the i18n catalog under `errors.api.<code>`.
 */
export const ErrorCodes = {
  Auth: {
    EmailAlreadyUsed: 'auth.emailAlreadyUsed',
    InvalidCredentials: 'auth.invalidCredentials',
    RefreshTokenInvalid: 'auth.refreshTokenInvalid',
    RefreshTokenExpired: 'auth.refreshTokenExpired',
    Unauthorized: 'auth.unauthorized',
  },
  Validation: {
    Failed: 'validation.failed',
  },
  Generic: {
    NotFound: 'generic.notFound',
    Internal: 'generic.internal',
  },
} as const;

export type ApiErrorCode =
  | (typeof ErrorCodes.Auth)[keyof typeof ErrorCodes.Auth]
  | (typeof ErrorCodes.Validation)[keyof typeof ErrorCodes.Validation]
  | (typeof ErrorCodes.Generic)[keyof typeof ErrorCodes.Generic];
