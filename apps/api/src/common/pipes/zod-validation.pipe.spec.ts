import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const schema = z.object({ email: z.string().email(), age: z.number().int().nonnegative() });
  const meta = { type: 'body' as const };

  it('returns parsed value on valid input', () => {
    const pipe = new ZodValidationPipe(schema);
    const result = pipe.transform({ email: 'a@b.co', age: 5 }, meta);
    expect(result).toEqual({ email: 'a@b.co', age: 5 });
  });

  it('throws BadRequestException with validation.failed code on invalid input', () => {
    const pipe = new ZodValidationPipe(schema);
    let thrown: unknown;
    try {
      pipe.transform({ email: 'not-email', age: -1 }, meta);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(BadRequestException);
    const body = (thrown as BadRequestException).getResponse() as {
      error: { code: string; details: unknown };
    };
    expect(body.error.code).toBe('validation.failed');
    expect(body.error.details).toBeDefined();
  });
});
