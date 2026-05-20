import { BadRequestException } from '@nestjs/common';
import { CuidValidationPipe } from './cuid-validation.pipe';

describe('CuidValidationPipe', () => {
  it('returns a valid cuid unchanged', () => {
    const pipe = new CuidValidationPipe();
    expect(pipe.transform('clw5f7n4i000008l7d8v8h6zr')).toBe('clw5f7n4i000008l7d8v8h6zr');
  });

  it('throws validation.failed for malformed ids', () => {
    const pipe = new CuidValidationPipe();
    let thrown: unknown;
    try {
      pipe.transform('not-a-cuid');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(BadRequestException);
    const body = (thrown as BadRequestException).getResponse() as { error: { code: string } };
    expect(body.error.code).toBe('validation.failed');
  });
});