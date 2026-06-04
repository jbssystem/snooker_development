import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TrainingService } from './training.service';

/**
 * Covers the two recovery operations added on top of the basic CRUD:
 *   - reopenSession: undo an accidental finish, but only on the same calendar day.
 *   - removeDrill: drop an in-progress drill execution, but never a finished one.
 */
describe('TrainingService', () => {
  function makeService(prismaOverrides: Record<string, unknown>) {
    const prisma = { ...prismaOverrides };
    const service = new TrainingService(prisma as never);
    return { service, prisma };
  }

  function session(overrides: Record<string, unknown> = {}) {
    return {
      id: 's1',
      playerProfileId: 'p1',
      createdByUserId: 'u1',
      startedAt: new Date(),
      endedAt: null,
      sessionType: 'SOLO',
      title: 'Session',
      goal: null,
      intensity: null,
      fatigueBefore: null,
      fatigueAfter: null,
      focusLevel: null,
      mood: null,
      notes: null,
      drillExecutions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  function execution(overrides: Record<string, unknown> = {}) {
    return {
      id: 'e1',
      trainingSessionId: 's1',
      drillTemplateId: 'd1',
      playerProfileId: 'p1',
      startedAt: new Date(),
      endedAt: null,
      attempts: 0,
      successes: 0,
      score: null,
      maxRun: null,
      averageScore: null,
      resultJson: null,
      errorTags: [],
      coachNotes: null,
      playerNotes: null,
      tableLayoutSnapshotJson: null,
      drillTemplate: { name: 'Drill' },
      attemptsLog: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  describe('reopenSession', () => {
    it('clears endedAt for a session finished today', async () => {
      const update = jest.fn().mockResolvedValue(session({ endedAt: null }));
      const { service } = makeService({
        trainingSession: {
          findFirst: jest.fn().mockResolvedValue(session({ endedAt: new Date(), startedAt: new Date() })),
          update,
        },
      });

      await service.reopenSession('p1', 's1');

      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 's1' }, data: { endedAt: null, fatigueAfter: null } }),
      );
    });

    it('rejects reopening a session finished on a previous day', async () => {
      const update = jest.fn();
      const { service } = makeService({
        trainingSession: {
          findFirst: jest
            .fn()
            .mockResolvedValue(session({ endedAt: new Date(), startedAt: new Date('2020-01-01T10:00:00Z') })),
          update,
        },
      });

      await expect(service.reopenSession('p1', 's1')).rejects.toBeInstanceOf(BadRequestException);
      expect(update).not.toHaveBeenCalled();
    });

    it('is a no-op for an already-open session', async () => {
      const update = jest.fn();
      const { service } = makeService({
        trainingSession: {
          findFirst: jest.fn().mockResolvedValue(session({ endedAt: null })),
          update,
        },
      });

      await service.reopenSession('p1', 's1');

      expect(update).not.toHaveBeenCalled();
    });

    it('throws NotFound when the session is missing', async () => {
      const { service } = makeService({
        trainingSession: { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn() },
      });

      await expect(service.reopenSession('p1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('removeDrill', () => {
    it('deletes an in-progress execution', async () => {
      const del = jest.fn().mockResolvedValue(undefined);
      const { service } = makeService({
        drillExecution: {
          findFirst: jest.fn().mockResolvedValue(execution({ endedAt: null })),
          delete: del,
        },
      });

      await service.removeDrill('p1', 'e1');

      expect(del).toHaveBeenCalledWith({ where: { id: 'e1' } });
    });

    it('refuses to delete a finished execution', async () => {
      const del = jest.fn();
      const { service } = makeService({
        drillExecution: {
          findFirst: jest.fn().mockResolvedValue(execution({ endedAt: new Date() })),
          delete: del,
        },
      });

      await expect(service.removeDrill('p1', 'e1')).rejects.toBeInstanceOf(BadRequestException);
      expect(del).not.toHaveBeenCalled();
    });

    it('throws NotFound when the execution is missing', async () => {
      const { service } = makeService({
        drillExecution: { findFirst: jest.fn().mockResolvedValue(null), delete: jest.fn() },
      });

      await expect(service.removeDrill('p1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
