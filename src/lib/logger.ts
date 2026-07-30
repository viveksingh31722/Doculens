import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'SYS:standard',
        },
      }
    : undefined,
});

export function logWorkflow(requestId: string, event: string, metadata: Record<string, unknown> = {}) {
  // Prevent logging any fields that might contain raw API keys or passwords
  const sanitizedMeta = { ...metadata };
  delete sanitizedMeta.apiKey;
  delete sanitizedMeta.password;
  delete sanitizedMeta.secret;

  logger.info({
    requestId,
    event,
    ...sanitizedMeta,
  }, `Workflow: ${event}`);
}
