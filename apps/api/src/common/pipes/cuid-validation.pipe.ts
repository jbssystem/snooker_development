import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { z } from 'zod';
import { ErrorCodes } from '@snooker/shared';

const CuidSchema = z.string().cuid();

@Injectable()
export class CuidValidationPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const parsed = CuidSchema.safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException({ error: { code: ErrorCodes.Validation.Failed } });
    }
    return parsed.data;
  }
}