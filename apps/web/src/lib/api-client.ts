import type {
  AccessibleProfile,
  CreateInvitationInput,
  IncomingInvitation,
  InvitationPreview,
  ProfileInvitationSummary,
  ProfileMember,
  UpdateMemberAccessInput,
  AuthMe,
  AuthSession,
  ActiveAnnouncement,
  Announcement,
  AdminUserList,
  AdminUserDetail,
  AdminStats,
  AiSettings,
  UpdateAiSettingsInput,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
  AddDrillExecutionInput,
  ActiveAiFocusPreset,
  AiFocusPreset,
  AiReport,
  CreateAiFocusPresetInput,
  UpdateAiFocusPresetInput,
  CreateEquipmentProfileInput,
  CreateDrillTemplateInput,
  RecognizeLayoutInput,
  TableLayout,
  CreateDrillAttemptInput,
  CreateExternalLinkInput,
  CreateMatchInput,
  CreateTrainingSessionInput,
  DrillAttempt,
  DrillExecution,
  DrillTemplate,
  EquipmentProfile,
  ExternalImportJob,
  ExternalPlayerLink,
  FinishDrillExecutionInput,
  FinishTrainingSessionInput,
  GenerateExternalMatchReportInput,
  GenerateWeeklyAiReportInput,
  LoginInput,
  AddMatchFrameInput,
  CalendarEvent,
  Match,
  MatchFrame,
  CreateCalendarEventInput,
  PlayerDashboard,
  PlayerProfile,
  RegisterInput,
  RegisterResult,
  VerifyEmailInput,
  ResendVerificationInput,
  ChangePasswordInput,
  CreateLifestyleFactorInput,
  CreateSupplementEventInput,
  LifestyleFactor,
  SupplementEvent,
  UpdateCalendarEventInput,
  TrainingSession,
  Tokens,
  UpdateDrillTemplateInput,
  UpdateEquipmentProfileInput,
  UpdateMatchFrameInput,
  UpdateMatchInput,
  UpdateLifestyleFactorInput,
  UpdateSupplementEventInput,
  UpdateTrainingSessionInput,
  UpsertPlayerProfileInput,
} from '@snooker/shared';
import { useAuthStore } from '@/lib/auth-store';

export type ImportedMatch = {
  id: string;
  matchDate: string;
  tournament: string | null;
  round: string | null;
  format: string | null;
  opponentName: string;
  opponentExternalId: string | null;
  framesWon: number;
  framesLost: number;
  highBreak: number | null;
  breaks50: number;
  breaks70: number;
  breaks100: number;
  decidingFrameResult: string | null;
  result: string;
  sourceUrl: string | null;
  notes: string | null;
  frames: Array<{
    frameNumber: number;
    playerScore: number | null;
    opponentScore: number | null;
    winner: string;
    highBreak: number | null;
    notes: string | null;
  }>;
};

const BASE_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) || 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(code);
    this.name = 'ApiError';
  }
}

type FetchOptions = RequestInit & { token?: string | null };

async function request<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  return requestWithRefresh(path, opts, true);
}

async function requestWithRefresh<T>(path: string, opts: FetchOptions, retryOnUnauthorized: boolean): Promise<T> {
  try {
    return await send<T>(path, opts);
  } catch (error) {
    if (retryOnUnauthorized && opts.token && error instanceof ApiError && error.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return requestWithRefresh<T>(path, { ...opts, token: refreshed.accessToken }, false);
      }
      useAuthStore.getState().clear();
    }
    throw error;
  }
}

async function send<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const { token, headers, ...rest } = opts;
  // Tell the API which cabinet the request acts in. Only sent on authenticated
  // requests; the backend resolves access (owner / shared) from it.
  const activeProfileId = token ? useAuthStore.getState().activeProfileId : null;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    credentials: rest.credentials ?? 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(activeProfileId ? { 'X-Active-Profile': activeProfileId } : {}),
      ...headers,
    },
  });
  if (!res.ok) {
    let code = 'generic.internal';
    let details: unknown;
    try {
      const body = (await res.json()) as { error?: { code?: string; details?: unknown } };
      code = body.error?.code ?? code;
      details = body.error?.details;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, code, details);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * Mint a fresh access token from the httpOnly `snooker_refresh` cookie and store
 * it in memory. Returns the tokens, or `null` if the refresh failed (no/expired
 * cookie). Used both by the 401→refresh→retry path below and by `AuthGuard` on
 * app load to restore an in-memory session without persisting the token.
 */
export async function refreshAccessToken(): Promise<Tokens | null> {
  try {
    const tokens = await send<Tokens>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    useAuthStore.getState().setTokens(tokens);
    return tokens;
  } catch {
    return null;
  }
}

export const api = {
  auth: {
    register: (input: RegisterInput) =>
      request<RegisterResult>('/auth/register', { method: 'POST', body: JSON.stringify(input) }),
    login: (input: LoginInput) =>
      request<AuthSession>('/auth/login', { method: 'POST', body: JSON.stringify(input) }),
    verifyEmail: (input: VerifyEmailInput) =>
      request<AuthSession>('/auth/verify-email', { method: 'POST', body: JSON.stringify(input) }),
    resendVerification: (input: ResendVerificationInput) =>
      request<void>('/auth/resend-verification', { method: 'POST', body: JSON.stringify(input) }),
    refresh: () =>
      request<Tokens>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    logout: () =>
      request<void>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    me: (token: string) => request<AuthMe>('/auth/me', { token }),
    changePassword: (token: string, input: ChangePasswordInput) =>
      request<void>('/auth/change-password', { method: 'POST', token, body: JSON.stringify(input) }),
  },
  profiles: {
    // Cabinets the user can switch between (own + shared).
    accessible: (token: string) => request<AccessibleProfile[]>('/profiles/accessible', { token }),
    // Owner-only management of the active cabinet's access.
    listMembers: (token: string) => request<ProfileMember[]>('/profiles/me/members', { token }),
    updateMember: (token: string, userId: string, input: UpdateMemberAccessInput) =>
      request<ProfileMember>(`/profiles/me/members/${userId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(input),
      }),
    removeMember: (token: string, userId: string) =>
      request<void>(`/profiles/me/members/${userId}`, { method: 'DELETE', token }),
    listInvitations: (token: string) =>
      request<ProfileInvitationSummary[]>('/profiles/me/invitations', { token }),
    invite: (token: string, input: CreateInvitationInput) =>
      request<ProfileInvitationSummary>('/profiles/me/invitations', {
        method: 'POST',
        token,
        body: JSON.stringify(input),
      }),
    revokeInvitation: (token: string, id: string) =>
      request<void>(`/profiles/me/invitations/${id}`, { method: 'DELETE', token }),
  },
  invitations: {
    // In-app invitations addressed to the logged-in user.
    incoming: (token: string) => request<IncomingInvitation[]>('/invitations/incoming', { token }),
    acceptIncoming: (token: string, id: string) =>
      request<void>(`/invitations/incoming/${id}/accept`, { method: 'POST', token }),
    declineIncoming: (token: string, id: string) =>
      request<void>(`/invitations/incoming/${id}/decline`, { method: 'POST', token }),
    // Email-link flow: preview is public; accept/decline need auth.
    preview: (inviteToken: string) =>
      request<InvitationPreview>(`/invitations/token/${inviteToken}`),
    acceptToken: (token: string, inviteToken: string) =>
      request<void>(`/invitations/token/${inviteToken}/accept`, { method: 'POST', token }),
    declineToken: (token: string, inviteToken: string) =>
      request<void>(`/invitations/token/${inviteToken}/decline`, { method: 'POST', token }),
  },
  players: {
    getProfile: (token: string) => request<PlayerProfile | null>('/players/me/profile', { token }),
    upsertProfile: (token: string, input: UpsertPlayerProfileInput) =>
      request<PlayerProfile>('/players/me/profile', {
        method: 'PUT',
        token,
        body: JSON.stringify(input),
      }),
    updateAvatar: (token: string, avatar: string) =>
      request<PlayerProfile>('/players/me/profile/avatar', {
        method: 'PATCH',
        token,
        body: JSON.stringify({ avatar }),
      }),
    listEquipment: (token: string) =>
      request<EquipmentProfile[]>('/players/me/equipment-profiles', { token }),
    createEquipment: (token: string, input: CreateEquipmentProfileInput) =>
      request<EquipmentProfile>('/players/me/equipment-profiles', {
        method: 'POST',
        token,
        body: JSON.stringify(input),
      }),
    updateEquipment: (token: string, id: string, input: UpdateEquipmentProfileInput) =>
      request<EquipmentProfile>(`/players/me/equipment-profiles/${id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(input),
      }),
    deleteEquipment: (token: string, id: string) =>
      request<void>(`/players/me/equipment-profiles/${id}`, {
        method: 'DELETE',
        token,
      }),
  },
  drills: {
    listTemplates: (token: string) => request<DrillTemplate[]>('/drill-templates', { token }),
    getTemplate: (token: string, id: string) =>
      request<DrillTemplate>(`/drill-templates/${id}`, { token }),
    createTemplate: (token: string, input: CreateDrillTemplateInput) =>
      request<DrillTemplate>('/drill-templates', {
        method: 'POST',
        token,
        body: JSON.stringify(input),
      }),
    recognizeLayout: (token: string, input: RecognizeLayoutInput) =>
      request<TableLayout>('/drill-templates/recognize-layout', {
        method: 'POST',
        token,
        body: JSON.stringify(input),
      }),
    updateTemplate: (token: string, id: string, input: UpdateDrillTemplateInput) =>
      request<DrillTemplate>(`/drill-templates/${id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(input),
      }),
    deleteTemplate: (token: string, id: string) =>
      request<void>(`/drill-templates/${id}`, {
        method: 'DELETE',
        token,
      }),
    toggleFavorite: (token: string, id: string) =>
      request<void>(`/drill-templates/${id}/favorite`, {
        method: 'POST',
        token,
      }),
  },
  training: {
    listSessions: (token: string) => request<TrainingSession[]>('/training-sessions', { token }),
    getSession: (token: string, id: string) =>
      request<TrainingSession>(`/training-sessions/${id}`, { token }),
    createSession: (token: string, input: CreateTrainingSessionInput) =>
      request<TrainingSession>('/training-sessions', {
        method: 'POST',
        token,
        body: JSON.stringify(input),
      }),
    updateSession: (token: string, id: string, input: UpdateTrainingSessionInput) =>
      request<TrainingSession>(`/training-sessions/${id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(input),
      }),
    finishSession: (token: string, id: string, input: FinishTrainingSessionInput) =>
      request<TrainingSession>(`/training-sessions/${id}/finish`, {
        method: 'POST',
        token,
        body: JSON.stringify(input),
      }),
    reopenSession: (token: string, id: string) =>
      request<TrainingSession>(`/training-sessions/${id}/reopen`, {
        method: 'POST',
        token,
      }),
    addDrill: (token: string, sessionId: string, input: AddDrillExecutionInput) =>
      request<DrillExecution>(`/training-sessions/${sessionId}/drills`, {
        method: 'POST',
        token,
        body: JSON.stringify(input),
      }),
    removeDrill: (token: string, executionId: string) =>
      request<void>(`/drill-executions/${executionId}`, {
        method: 'DELETE',
        token,
      }),
    addAttempt: (token: string, executionId: string, input: CreateDrillAttemptInput) =>
      request<DrillAttempt>(`/drill-executions/${executionId}/attempts`, {
        method: 'POST',
        token,
        body: JSON.stringify(input),
      }),
    finishDrill: (token: string, executionId: string, input: FinishDrillExecutionInput) =>
      request<DrillExecution>(`/drill-executions/${executionId}/finish`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(input),
      }),
    removeLastAttempt: (token: string, executionId: string) =>
      request<DrillExecution>(`/drill-executions/${executionId}/attempts/last`, {
        method: 'DELETE',
        token,
      }),
  },
  dashboard: {
    getPlayerDashboard: (token: string) =>
      request<PlayerDashboard>('/players/me/dashboard', { token }),
  },
  matches: {
    list: (token: string) => request<Match[]>('/matches', { token }),
    get: (token: string, id: string) => request<Match>(`/matches/${id}`, { token }),
    create: (token: string, input: CreateMatchInput) =>
      request<Match>('/matches', {
        method: 'POST',
        token,
        body: JSON.stringify(input),
      }),
    update: (token: string, id: string, input: UpdateMatchInput) =>
      request<Match>(`/matches/${id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(input),
      }),
    addFrame: (token: string, id: string, input: AddMatchFrameInput) =>
      request<MatchFrame>(`/matches/${id}/frames`, {
        method: 'POST',
        token,
        body: JSON.stringify(input),
      }),
    updateFrame: (token: string, id: string, frameNumber: number, input: UpdateMatchFrameInput) =>
      request<Match>(`/matches/${id}/frames/${frameNumber}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(input),
      }),
    removeLastFrame: (token: string, id: string) =>
      request<Match>(`/matches/${id}/frames/last`, { method: 'DELETE', token }),
  },
  calendar: {
    listEvents: (token: string) => request<CalendarEvent[]>('/calendar-events', { token }),
    createEvent: (token: string, input: CreateCalendarEventInput) =>
      request<CalendarEvent>('/calendar-events', {
        method: 'POST',
        token,
        body: JSON.stringify(input),
      }),
    updateEvent: (token: string, id: string, input: UpdateCalendarEventInput) =>
      request<CalendarEvent>(`/calendar-events/${id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(input),
      }),
    listLifestyleFactors: (token: string) =>
      request<LifestyleFactor[]>('/lifestyle-factors', { token }),
    saveLifestyleFactor: (token: string, input: CreateLifestyleFactorInput) =>
      request<LifestyleFactor>('/lifestyle-factors', {
        method: 'POST',
        token,
        body: JSON.stringify(input),
      }),
    updateLifestyleFactor: (token: string, id: string, input: UpdateLifestyleFactorInput) =>
      request<LifestyleFactor>(`/lifestyle-factors/${id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(input),
      }),
    listSupplementEvents: (token: string) =>
      request<SupplementEvent[]>('/supplement-events', { token }),
    createSupplementEvent: (token: string, input: CreateSupplementEventInput) =>
      request<SupplementEvent>('/supplement-events', {
        method: 'POST',
        token,
        body: JSON.stringify(input),
      }),
    updateSupplementEvent: (token: string, id: string, input: UpdateSupplementEventInput) =>
      request<SupplementEvent>(`/supplement-events/${id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(input),
      }),
  },
  ai: {
    listFocusPresets: (token: string, locale: string) =>
      request<ActiveAiFocusPreset[]>(`/ai/focus-presets?locale=${encodeURIComponent(locale)}`, { token }),
    listReports: (token: string) => request<AiReport[]>('/ai/reports', { token }),
    getReport: (token: string, id: string) => request<AiReport>(`/ai/reports/${id}`, { token }),
    generateWeeklyReport: (token: string, input: GenerateWeeklyAiReportInput) =>
      request<AiReport>('/ai/reports/generate', {
        method: 'POST',
        token,
        body: JSON.stringify(input),
      }),
    generateExternalMatchReport: (token: string, input: GenerateExternalMatchReportInput) =>
      request<AiReport>('/ai/reports/generate-external', {
        method: 'POST',
        token,
        body: JSON.stringify(input),
      }),
  },
  externalSources: {
    listLinks: (token: string) => request<ExternalPlayerLink[]>('/external-links', { token }),
    createLink: (token: string, input: CreateExternalLinkInput) =>
      request<ExternalPlayerLink>('/external-links', {
        method: 'POST',
        token,
        body: JSON.stringify(input),
      }),
    deleteLink: (token: string, id: string) =>
      request<void>(`/external-links/${id}`, {
        method: 'DELETE',
        token,
      }),
    triggerSync: (token: string, id: string) =>
      request<ExternalImportJob>(`/external-links/${id}/sync`, {
        method: 'POST',
        token,
        body: JSON.stringify({}),
      }),
    listJobs: (token: string, id: string) =>
      request<ExternalImportJob[]>(`/external-links/${id}/jobs`, { token }),
    listImportedMatches: (token: string) =>
      request<ImportedMatch[]>('/external-links/imported-matches', { token }),
  },
  announcements: {
    listActive: (token: string) =>
      request<ActiveAnnouncement[]>('/announcements/active', { token }),
    dismiss: (token: string, id: string) =>
      request<void>(`/announcements/${id}/dismiss`, { method: 'POST', token, body: JSON.stringify({}) }),
  },
  admin: {
    listUsers: (token: string, query: Record<string, string | number | undefined> = {}) => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '') params.set(k, String(v));
      const qs = params.toString();
      return request<AdminUserList>(`/admin/users${qs ? `?${qs}` : ''}`, { token });
    },
    getUser: (token: string, id: string) => request<AdminUserDetail>(`/admin/users/${id}`, { token }),
    blockUser: (token: string, id: string, reason?: string) =>
      request<AdminUserDetail>(`/admin/users/${id}/block`, {
        method: 'POST',
        token,
        body: JSON.stringify({ reason }),
      }),
    unblockUser: (token: string, id: string) =>
      request<AdminUserDetail>(`/admin/users/${id}/unblock`, { method: 'POST', token, body: JSON.stringify({}) }),
    grantAdmin: (token: string, id: string) =>
      request<AdminUserDetail>(`/admin/users/${id}/roles/system-admin`, {
        method: 'POST',
        token,
        body: JSON.stringify({}),
      }),
    revokeAdmin: (token: string, id: string) =>
      request<AdminUserDetail>(`/admin/users/${id}/roles/system-admin`, { method: 'DELETE', token }),
    verifyUser: (token: string, id: string) =>
      request<AdminUserDetail>(`/admin/users/${id}/verify`, { method: 'POST', token, body: JSON.stringify({}) }),
    resendVerification: (token: string, id: string) =>
      request<void>(`/admin/users/${id}/resend-verification`, {
        method: 'POST',
        token,
        body: JSON.stringify({}),
      }),
    listAnnouncements: (token: string) => request<Announcement[]>('/admin/announcements', { token }),
    createAnnouncement: (token: string, input: CreateAnnouncementInput) =>
      request<Announcement>('/admin/announcements', { method: 'POST', token, body: JSON.stringify(input) }),
    updateAnnouncement: (token: string, id: string, input: UpdateAnnouncementInput) =>
      request<Announcement>(`/admin/announcements/${id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(input),
      }),
    publishAnnouncement: (token: string, id: string) =>
      request<Announcement>(`/admin/announcements/${id}/publish`, {
        method: 'POST',
        token,
        body: JSON.stringify({}),
      }),
    unpublishAnnouncement: (token: string, id: string) =>
      request<Announcement>(`/admin/announcements/${id}/unpublish`, {
        method: 'POST',
        token,
        body: JSON.stringify({}),
      }),
    deleteAnnouncement: (token: string, id: string) =>
      request<void>(`/admin/announcements/${id}`, { method: 'DELETE', token }),
    listDrills: (token: string, search?: string) =>
      request<DrillTemplate[]>(`/admin/drill-templates${search ? `?search=${encodeURIComponent(search)}` : ''}`, {
        token,
      }),
    setDrillVisibility: (token: string, id: string, visibility: 'private' | 'shared' | 'system') =>
      request<DrillTemplate>(`/admin/drill-templates/${id}/visibility`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ visibility }),
      }),
    getStats: (token: string) => request<AdminStats>('/admin/stats', { token }),
    getAiSettings: (token: string) => request<AiSettings>('/admin/ai-settings', { token }),
    updateAiSettings: (token: string, input: UpdateAiSettingsInput) =>
      request<AiSettings>('/admin/ai-settings', { method: 'PUT', token, body: JSON.stringify(input) }),
    listAiFocusPresets: (token: string) => request<AiFocusPreset[]>('/admin/ai-focus-presets', { token }),
    createAiFocusPreset: (token: string, input: CreateAiFocusPresetInput) =>
      request<AiFocusPreset>('/admin/ai-focus-presets', { method: 'POST', token, body: JSON.stringify(input) }),
    updateAiFocusPreset: (token: string, id: string, input: UpdateAiFocusPresetInput) =>
      request<AiFocusPreset>(`/admin/ai-focus-presets/${id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(input),
      }),
    deleteAiFocusPreset: (token: string, id: string) =>
      request<void>(`/admin/ai-focus-presets/${id}`, { method: 'DELETE', token }),
  },
};
