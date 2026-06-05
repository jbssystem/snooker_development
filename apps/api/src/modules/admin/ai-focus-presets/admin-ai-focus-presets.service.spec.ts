import { ConflictException, NotFoundException } from '@nestjs/common';
import { AdminAiFocusPresetsService, toAiFocusPreset } from './admin-ai-focus-presets.service';

/**
 * Unit tests for focus-preset CRUD: slug uniqueness on create/update,
 * not-found guards, label JSON projection, and audit recording.
 */
describe('AdminAiFocusPresetsService', () => {
  const ROW = {
    id: 'cmseedfocus0improvements00',
    slug: 'improvements',
    labelJson: { ru: 'Улучшения', en: 'Improvements', uk: 'Покращення' },
    promptInstruction: 'Highlight improvements.',
    sortOrder: 10,
    isActive: true,
    createdByUserId: 'admin1',
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
  };

  function make(prismaOverrides: Record<string, unknown> = {}) {
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const prisma = {
      aiFocusPreset: {
        findMany: jest.fn().mockResolvedValue([ROW]),
        findUnique: jest.fn().mockResolvedValue(ROW),
        create: jest.fn().mockResolvedValue(ROW),
        update: jest.fn().mockResolvedValue(ROW),
        delete: jest.fn().mockResolvedValue(ROW),
      },
      ...prismaOverrides,
    };
    const service = new AdminAiFocusPresetsService(prisma as never, audit as never);
    return { service, prisma, audit };
  }

  it('projects label JSON into a typed record', () => {
    const dto = toAiFocusPreset(ROW as never);
    expect(dto.label).toEqual({ ru: 'Улучшения', en: 'Improvements', uk: 'Покращення' });
    expect(dto.slug).toBe('improvements');
  });

  it('creates a preset and records an audit entry', async () => {
    const { service, prisma, audit } = make({
      aiFocusPreset: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(ROW),
      },
    });
    await service.create('admin1', {
      slug: 'improvements',
      label: { ru: 'a', en: 'b', uk: 'c' },
      promptInstruction: 'x',
      sortOrder: 10,
      isActive: true,
    });
    expect(prisma.aiFocusPreset.create).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith('admin1', 'aiFocusPreset.create', expect.any(Object));
  });

  it('rejects a duplicate slug on create', async () => {
    const { service } = make({
      aiFocusPreset: { findUnique: jest.fn().mockResolvedValue({ ...ROW, id: 'other' }) },
    });
    await expect(
      service.create('admin1', {
        slug: 'improvements',
        label: { ru: 'a', en: 'b', uk: 'c' },
        promptInstruction: 'x',
        sortOrder: 0,
        isActive: true,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws when updating a missing preset', async () => {
    const { service } = make({
      aiFocusPreset: { findUnique: jest.fn().mockResolvedValue(null) },
    });
    await expect(service.update('admin1', 'missing', { sortOrder: 5 })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes a preset and records an audit entry', async () => {
    const { service, prisma, audit } = make();
    await service.delete('admin1', ROW.id);
    expect(prisma.aiFocusPreset.delete).toHaveBeenCalledWith({ where: { id: ROW.id } });
    expect(audit.record).toHaveBeenCalledWith('admin1', 'aiFocusPreset.delete', expect.any(Object));
  });
});
