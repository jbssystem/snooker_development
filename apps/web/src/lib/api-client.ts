import type {
  AuthMe,
  AuthSession,
  AddDrillExecutionInput,
  CreateEquipmentProfileInput,
  CreateDrillTemplateInput,
  CreateDrillAttemptInput,
  CreateMatchInput,
  CreateTrainingSessionInput,
  DrillAttempt,
  DrillExecution,
  DrillTemplate,
  EquipmentProfile,
  FinishDrillExecutionInput,
  FinishTrainingSessionInput,
  LoginInput,
  AddMatchFrameInput,
  CalendarEvent,
  Match,
  MatchFrame,
  CreateCalendarEventInput,
  PlayerDashboard,
  PlayerProfile,
  RegisterInput,
  CreateLifestyleFactorInput,
  CreateSupplementEventInput,
  LifestyleFactor,
  SupplementEvent,
  UpdateCalendarEventInput,
  TrainingSession,
  Tokens,
  UpdateDrillTemplateInput,
  UpdateEquipmentProfileInput,
  UpdateMatchInput,
  UpdateLifestyleFactorInput,
  UpdateSupplementEventInput,
  UpdateTrainingSessionInput,
  UpsertPlayerProfileInput,
} from '@snooker/shared';

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
  const { token, headers, ...rest } = opts;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

export const api = {
  auth: {
    register: (input: RegisterInput) =>
      request<AuthSession>('/auth/register', { method: 'POST', body: JSON.stringify(input) }),
    login: (input: LoginInput) =>
      request<AuthSession>('/auth/login', { method: 'POST', body: JSON.stringify(input) }),
    refresh: (refreshToken: string) =>
      request<Tokens>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }),
    logout: (refreshToken: string) =>
      request<void>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }),
    me: (token: string) => request<AuthMe>('/auth/me', { token }),
  },
  players: {
    getProfile: (token: string) => request<PlayerProfile | null>('/players/me/profile', { token }),
    upsertProfile: (token: string, input: UpsertPlayerProfileInput) =>
      request<PlayerProfile>('/players/me/profile', {
        method: 'PUT',
        token,
        body: JSON.stringify(input),
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
    addDrill: (token: string, sessionId: string, input: AddDrillExecutionInput) =>
      request<DrillExecution>(`/training-sessions/${sessionId}/drills`, {
        method: 'POST',
        token,
        body: JSON.stringify(input),
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
};
