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
import { CurrentUserId } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CalendarService } from './calendar.service';

@ApiTags('calendar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  @Get('calendar-events')
  listCalendarEvents(@CurrentUserId() userId: string): Promise<CalendarEvent[]> {
    return this.calendar.listCalendarEvents(userId);
  }

  @Get('calendar-events/:id')
  getCalendarEvent(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ): Promise<CalendarEvent> {
    return this.calendar.getCalendarEvent(userId, id);
  }

  @Post('calendar-events')
  createCalendarEvent(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(CreateCalendarEventSchema)) body: CreateCalendarEventInput,
  ): Promise<CalendarEvent> {
    return this.calendar.createCalendarEvent(userId, body);
  }

  @Patch('calendar-events/:id')
  updateCalendarEvent(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateCalendarEventSchema)) body: UpdateCalendarEventInput,
  ): Promise<CalendarEvent> {
    return this.calendar.updateCalendarEvent(userId, id, body);
  }

  @Get('lifestyle-factors')
  listLifestyleFactors(@CurrentUserId() userId: string): Promise<LifestyleFactor[]> {
    return this.calendar.listLifestyleFactors(userId);
  }

  @Get('lifestyle-factors/:id')
  getLifestyleFactor(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ): Promise<LifestyleFactor> {
    return this.calendar.getLifestyleFactor(userId, id);
  }

  @Post('lifestyle-factors')
  saveLifestyleFactor(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(CreateLifestyleFactorSchema)) body: CreateLifestyleFactorInput,
  ): Promise<LifestyleFactor> {
    return this.calendar.saveLifestyleFactor(userId, body);
  }

  @Patch('lifestyle-factors/:id')
  updateLifestyleFactor(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateLifestyleFactorSchema)) body: UpdateLifestyleFactorInput,
  ): Promise<LifestyleFactor> {
    return this.calendar.updateLifestyleFactor(userId, id, body);
  }

  @Get('supplement-events')
  listSupplementEvents(@CurrentUserId() userId: string): Promise<SupplementEvent[]> {
    return this.calendar.listSupplementEvents(userId);
  }

  @Get('supplement-events/:id')
  getSupplementEvent(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ): Promise<SupplementEvent> {
    return this.calendar.getSupplementEvent(userId, id);
  }

  @Post('supplement-events')
  createSupplementEvent(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(CreateSupplementEventSchema)) body: CreateSupplementEventInput,
  ): Promise<SupplementEvent> {
    return this.calendar.createSupplementEvent(userId, body);
  }

  @Patch('supplement-events/:id')
  updateSupplementEvent(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateSupplementEventSchema)) body: UpdateSupplementEventInput,
  ): Promise<SupplementEvent> {
    return this.calendar.updateSupplementEvent(userId, id, body);
  }
}
