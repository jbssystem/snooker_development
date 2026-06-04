import { SensitiveDataAuditService } from './sensitive-data-audit.service';

/**
 * Unit tests for the sensitive-data audit trail (TZ §16.3): a record maps to a
 * row with the right fields, and a failing insert is swallowed so it never
 * breaks the wellness-tracking flow it is observing.
 */
describe('SensitiveDataAuditService', () => {
  function makeService(createImpl: jest.Mock) {
    const prisma = { sensitiveDataAccessLog: { create: createImpl } };
    return new SensitiveDataAuditService(prisma as never);
  }

  it('writes an access-log row with the supplied fields', async () => {
    const create = jest.fn().mockResolvedValue({});
    const service = makeService(create);

    await service.record({
      actorUserId: 'u1',
      playerProfileId: 'p1',
      dataType: 'SUPPLEMENT',
      action: 'CREATE',
      targetId: 's1',
      metadata: { count: 3 },
      meta: { ip: '203.0.113.5', userAgent: 'jest' },
    });

    expect(create).toHaveBeenCalledTimes(1);
    const arg = create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(arg.data).toMatchObject({
      actorUserId: 'u1',
      playerProfileId: 'p1',
      dataType: 'SUPPLEMENT',
      action: 'CREATE',
      targetId: 's1',
      metadataJson: { count: 3 },
      ipAddress: '203.0.113.5',
      userAgent: 'jest',
    });
  });

  it('nulls out optional fields when not provided', async () => {
    const create = jest.fn().mockResolvedValue({});
    const service = makeService(create);

    await service.record({
      actorUserId: 'u1',
      playerProfileId: 'p1',
      dataType: 'LIFESTYLE',
      action: 'READ',
    });

    const arg = create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(arg.data.targetId).toBeNull();
    expect(arg.data.ipAddress).toBeNull();
    expect(arg.data.userAgent).toBeNull();
    expect('metadataJson' in arg.data).toBe(false);
  });

  it('swallows insert failures so auditing never breaks the caller', async () => {
    const create = jest.fn().mockRejectedValue(new Error('db down'));
    const service = makeService(create);
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);

    await expect(
      service.record({ actorUserId: 'u1', playerProfileId: 'p1', dataType: 'LIFESTYLE', action: 'READ' }),
    ).resolves.toBeUndefined();
  });
});
