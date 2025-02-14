import pino from 'pino';

export const logger = pino({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  timestamp: () => `,"time":"${new Date(Date.now()).toISOString()}"`,
  formatters: {
    level: (label) => {
      return { level: label };
    }
  }
});

// Create child loggers for specific components
export const wsLogger = logger.child({ component: 'websocket' });
export const serverLogger = logger.child({ component: 'server' });
