import { CalendarService } from './calendar.service';

/**
 * Verifies the calendar service emits a sensitive-data audit entry (TZ §16.3)
 * whenever wellness (lifestyle) or supplement data is read or written.
 */
describe('CalendarService sensitive-data auditing', () => {
  const PROFILE = { id: 'p1' };

  function makeService(prismaOverrides: Record<string, unknown>) {
    const prisma = {
      playerProfile: { findUnique: jest.fn().mockResolvedValue(PROFILE) },
      ...prismaOverrides,
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new CalendarService(prisma as never, audit as never);
    return { service, audit };
  }

  it('records a LIFESTYLE READ when listing lifestyle factors', async () => {
    const { service, audit } = makeService({
      lifestyleFactor: { findMany: jest.fn().mockResolvedValue([]) },
    });

    await service.listLifestyleFactors('u1');

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

    await service.saveLifestyleFactor('u1', { date: '2026-06-01' });

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

    await service.createSupplementEvent('u1', { name: 'Creatine', startDate: '2026-06-01' });

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ dataType: 'SUPPLEMENT', action: 'CREATE', targetId: 's1' }),
    );
  });

  it('does not audit when no profile exists (nothing was accessed)', async () => {
    const prisma = {
      playerProfile: { findUnique: jest.fn().mockResolvedValue(null) },
      lifestyleFactor: { findMany: jest.fn() },
    };
    const audit = { record: jest.fn() };
    const service = new CalendarService(prisma as never, audit as never);

    await expect(service.listLifestyleFactors('u1')).resolves.toEqual([]);
    expect(audit.record).not.toHaveBeenCalled();
  });
});
