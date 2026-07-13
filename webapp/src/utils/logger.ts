const getTimestamp = (): string => {
  const now = new Date();
  if (typeof window === 'undefined') {
    // Node environment timestamp format: YYYY-MM-DD HH:MM:SS
    const datePart = now.toISOString().split('T')[0];
    const timePart = now.toTimeString().split(' ')[0];
    return `${datePart} ${timePart}`;
  }
  return now.toTimeString().split(' ')[0]; // Browser: HH:MM:SS
};

const LOG_COLORS_BROWSER = {
  INFO: '#00E676',
  WARN: '#FFD600',
  ERROR: '#FF1744'
};

const LOG_COLORS_NODE = {
  INFO: '\x1b[32m',  // Green
  WARN: '\x1b[33m',  // Yellow
  ERROR: '\x1b[31m', // Red
  RESET: '\x1b[0m'
};

const log = (level: 'INFO' | 'WARN' | 'ERROR', code: string, message: string, ...args: any[]) => {
  const time = getTimestamp();

  if (typeof window !== 'undefined') {
    // Browser client console log
    const color = LOG_COLORS_BROWSER[level];
    const prefix = `%c[UNFUGLY WEB] ${time} ${level} | ${code}:`;
    const style = `color: ${color}; font-weight: bold;`;
    if (level === 'ERROR') {
      console.error(prefix, style, message, ...args);
    } else if (level === 'WARN') {
      console.warn(prefix, style, message, ...args);
    } else {
      console.log(prefix, style, message, ...args);
    }
  } else {
    // Node server console log (production server format: no prefix, just ANSI color and timestamp)
    const color = LOG_COLORS_NODE[level];
    const reset = LOG_COLORS_NODE.RESET;
    const formatted = `[${time}] ${color}${level}${reset} | ${code}: ${message}`;
    if (level === 'ERROR') {
      console.error(formatted, ...args);
    } else if (level === 'WARN') {
      console.warn(formatted, ...args);
    } else {
      console.log(formatted, ...args);
    }
  }
};

export const UnfuglyLog = {
  info: (code: string, message: string, ...args: any[]) => log('INFO', code, message, ...args),
  warn: (code: string, message: string, ...args: any[]) => log('WARN', code, message, ...args),
  error: (code: string, message: string, ...args: any[]) => log('ERROR', code, message, ...args)
};
