/**
 * Worker entry point — BullMQ consumers for AI summaries, imports, analytics.
 * Real queues are wired up in subsequent tasks.
 */
async function bootstrap(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('[worker] started; no queues registered yet');
  // Keep the process alive until queues are added.
  setInterval(() => undefined, 1 << 30);
}

void bootstrap();
