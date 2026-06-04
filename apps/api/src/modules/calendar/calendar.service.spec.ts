import { CalendarService } from './calendar.service';
import type { ProfileContext } from '../profiles/profile-context';

function ctx(overrides: Partial<ProfileContext> = {}): ProfileContext {
  return {
    userId: 'u1',
    profileId: 'p1',
    isOwner: true,
    accessLevel: 'EDIT',
    canAccessWellness: true,
    relationship: 'OWNER',
    ...overrides,
  };
}

/**
 * Verifies the calendar service emits a sensitive-data audit entry (TZ §16.3)
 * whenever wellness (lifestyle) or supplement data is read or written, and that
 * wellness-tagged calendar events are hidden from members without access.
 */
describe('CalendarService', () => {
  function makeService(prismaOverrides: Record<string, unknown>) {
    const prisma = {
      playerProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'p1' }) },
      ...prismaOverrides,
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new CalendarService(prisma as never, audit as never);
    return { service, audit, prisma };
  }

  it('records a LIFESTYLE READ when listing lifestyle factors', async () => {
    const { service, audit } = makeService({
      lifestyleFactor: { findMany: jest.fn().mockResolvedValue([]) },
    });

    await service.listLifestyleFactors(ctx());

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'u1',
        playerProfileId: 'p1',
        dataType: 'LIFESTYLE',
        action: 'READ',
      }),
    );
  });

  it('records a LIFESTYLE CREATE when saving a factor', async () => {
    const factor = {
      id: 'f1',
      playerProfileId: 'p1',
      date: new Date('2026-06-01'),
      illness: false,
      injury: false,
      travel: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const { service, audit } = makeService({
      lifestyleFactor: { upsert: jest.fn().mockResolvedValue(factor) },
    });

    await service.saveLifestyleFactor(ctx(), { date: '2026-06-01' });

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ dataType: 'LIFESTYLE', action: 'CREATE', targetId: 'f1' }),
    );
  });

  it('records a SUPPLEMENT CREATE when adding a supplement event', async () => {
    const event = {
      id: 's1',
      playerProfileId: 'p1',
      createdByUserId: 'u1',
      name: 'Creatine',
      startDate: new Date('2026-06-01'),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const { service, audit } = makeService({
      supplementEvent: { create: jest.fn().mockResolvedValue(event) },
    });

    await service.createSupplementEvent(ctx(), { name: 'Creatine', startDate: '2026-06-01' });

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ dataType: 'SUPPLEMENT', action: 'CREATE', targetId: 's1' }),
    );
  });

  it('hides wellness-tagged calendar events from members without wellness access', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const { service } = makeService({ calendarEvent: { findMany } });

    await service.listCalendarEvents(ctx({ isOwner: false, canAccessWellness: false, relationship: 'GUEST' }));

    const where = findMany.mock.calls[0][0].where as { eventType?: { notIn?: string[] } };
    expect(where.eventType?.notIn).toEqual(
      expect.arrayContaining(['ILLNESS', 'INJURY', 'SLEEP_ISSUE', 'SUPPLEMENT_START']),
    );
  });

  it('does not filter calendar events for members with wellness access', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const { service } = makeService({ calendarEvent: { findMany } });

    await service.listCalendarEvents(ctx({ canAccessWellness: true }));

    const where = findMany.mock.calls[0][0].where as { eventType?: unknown };
    expect(where.eventType).toBeUndefined();
  });
});
