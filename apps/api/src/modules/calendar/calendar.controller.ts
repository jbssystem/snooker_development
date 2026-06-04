import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CreateCalendarEventSchema,
  CreateLifestyleFactorSchema,
  CreateSupplementEventSchema,
  UpdateCalendarEventSchema,
  UpdateLifestyleFactorSchema,
  UpdateSupplementEventSchema,
  type CalendarEvent,
  type CreateCalendarEventInput,
  type CreateLifestyleFactorInput,
  type CreateSupplementEventInput,
  type LifestyleFactor,
  type SupplementEvent,
  type UpdateCalendarEventInput,
  type UpdateLifestyleFactorInput,
  type UpdateSupplementEventInput,
} from '@snooker/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CuidValidationPipe } from '../../common/pipes/cuid-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveProfileGuard } from '../profiles/guards/active-profile.guard';
import {
  ActiveProfile,
  CurrentProfile,
} from '../profiles/decorators/active-profile.decorator';
import { RequiresWellness, WriteAccess } from '../profiles/decorators/access.decorators';
import type { ProfileContext } from '../profiles/profile-context';
import { CalendarService } from './calendar.service';

@ApiTags('calendar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ActiveProfileGuard)
@Controller()
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  @Get('calendar-events')
  listCalendarEvents(@ActiveProfile() ctx: ProfileContext | null): Promise<CalendarEvent[]> {
    return ctx ? this.calendar.listCalendarEvents(ctx) : Promise.resolve([]);
  }

  @Get('calendar-events/:id')
  getCalendarEvent(
    @CurrentProfile() ctx: ProfileContext,
    @Param('id', CuidValidationPipe) id: string,
  ): Promise<CalendarEvent> {
    return this.calendar.getCalendarEvent(ctx, id);
  }

  @Post('calendar-events')
  @WriteAccess()
  createCalendarEvent(
    @CurrentProfile() ctx: ProfileContext,
    @Body(new ZodValidationPipe(CreateCalendarEventSchema)) body: CreateCalendarEventInput,
  ): Promise<CalendarEvent> {
    return this.calendar.createCalendarEvent(ctx, body);
  }

  @Patch('calendar-events/:id')
  @WriteAccess()
  updateCalendarEvent(
    @CurrentProfile() ctx: ProfileContext,
    @Param('id', CuidValidationPipe) id: string,
    @Body(new ZodValidationPipe(UpdateCalendarEventSchema)) body: UpdateCalendarEventInput,
  ): Promise<CalendarEvent> {
    return this.calendar.updateCalendarEvent(ctx, id, body);
  }

  @Get('lifestyle-factors')
  @RequiresWellness()
  listLifestyleFactors(@CurrentProfile() ctx: ProfileContext): Promise<LifestyleFactor[]> {
    return this.calendar.listLifestyleFactors(ctx);
  }

  @Get('lifestyle-factors/:id')
  @RequiresWellness()
  getLifestyleFactor(
    @CurrentProfile() ctx: ProfileContext,
    @Param('id', CuidValidationPipe) id: string,
  ): Promise<LifestyleFactor> {
    return this.calendar.getLifestyleFactor(ctx, id);
  }

  @Post('lifestyle-factors')
  @RequiresWellness()
  @WriteAccess()
  saveLifestyleFactor(
    @CurrentProfile() ctx: ProfileContext,
    @Body(new ZodValidationPipe(CreateLifestyleFactorSchema)) body: CreateLifestyleFactorInput,
  ): Promise<LifestyleFactor> {
    return this.calendar.saveLifestyleFactor(ctx, body);
  }

  @Patch('lifestyle-factors/:id')
  @RequiresWellness()
  @WriteAccess()
  updateLifestyleFactor(
    @CurrentProfile() ctx: ProfileContext,
    @Param('id', CuidValidationPipe) id: string,
    @Body(new ZodValidationPipe(UpdateLifestyleFactorSchema)) body: UpdateLifestyleFactorInput,
  ): Promise<LifestyleFactor> {
    return this.calendar.updateLifestyleFactor(ctx, id, body);
  }

  @Get('supplement-events')
  @RequiresWellness()
  listSupplementEvents(@CurrentProfile() ctx: ProfileContext): Promise<SupplementEvent[]> {
    return this.calendar.listSupplementEvents(ctx);
  }

  @Get('supplement-events/:id')
  @RequiresWellness()
  getSupplementEvent(
    @CurrentProfile() ctx: ProfileContext,
    @Param('id', CuidValidationPipe) id: string,
  ): Promise<SupplementEvent> {
    return this.calendar.getSupplementEvent(ctx, id);
  }

  @Post('supplement-events')
  @RequiresWellness()
  @WriteAccess()
  createSupplementEvent(
    @CurrentProfile() ctx: ProfileContext,
    @Body(new ZodValidationPipe(CreateSupplementEventSchema)) body: CreateSupplementEventInput,
  ): Promise<SupplementEvent> {
    return this.calendar.createSupplementEvent(ctx, body);
  }

  @Patch('supplement-events/:id')
  @RequiresWellness()
  @WriteAccess()
  updateSupplementEvent(
    @CurrentProfile() ctx: ProfileContext,
    @Param('id', CuidValidationPipe) id: string,
    @Body(new ZodValidationPipe(UpdateSupplementEventSchema)) body: UpdateSupplementEventInput,
  ): Promise<SupplementEvent> {
    return this.calendar.updateSupplementEvent(ctx, id, body);
  }
}
