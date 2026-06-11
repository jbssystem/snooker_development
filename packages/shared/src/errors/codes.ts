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
    Forbidden: 'auth.forbidden',
    EmailNotVerified: 'auth.emailNotVerified',
    AccountBlocked: 'auth.accountBlocked',
    VerificationTokenInvalid: 'auth.verificationTokenInvalid',
    VerificationTokenExpired: 'auth.verificationTokenExpired',
  },
  Admin: {
    LastAdmin: 'admin.lastAdmin',
    CannotBlockSelf: 'admin.cannotBlockSelf',
    CannotDeleteSelf: 'admin.cannotDeleteSelf',
  },
  Sharing: {
    ProfileAccessDenied: 'sharing.profileAccessDenied',
    WriteAccessDenied: 'sharing.writeAccessDenied',
    OwnerOnly: 'sharing.ownerOnly',
    WellnessAccessDenied: 'sharing.wellnessAccessDenied',
    CannotInviteSelf: 'sharing.cannotInviteSelf',
    AlreadyMember: 'sharing.alreadyMember',
    InvitationInvalid: 'sharing.invitationInvalid',
    InvitationExpired: 'sharing.invitationExpired',
    InvitationEmailMismatch: 'sharing.invitationEmailMismatch',
    NoProfile: 'sharing.noProfile',
  },
  Validation: {
    Failed: 'validation.failed',
  },
  Drills: {
    AiUnavailable: 'drills.aiUnavailable',
    RecognitionFailed: 'drills.recognitionFailed',
  },
  Generic: {
    NotFound: 'generic.notFound',
    Internal: 'generic.internal',
  },
} as const;

export type ApiErrorCode =
  | (typeof ErrorCodes.Auth)[keyof typeof ErrorCodes.Auth]
  | (typeof ErrorCodes.Admin)[keyof typeof ErrorCodes.Admin]
  | (typeof ErrorCodes.Sharing)[keyof typeof ErrorCodes.Sharing]
  | (typeof ErrorCodes.Validation)[keyof typeof ErrorCodes.Validation]
  | (typeof ErrorCodes.Drills)[keyof typeof ErrorCodes.Drills]
  | (typeof ErrorCodes.Generic)[keyof typeof ErrorCodes.Generic];
