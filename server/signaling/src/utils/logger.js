const winston = require('winston');
const { format, transports } = winston;
const path = require('path');
require('winston-daily-rotate-file');

// Define custom log format
const logFormat = format.printf(({ level, message, timestamp, ...meta }) => {
  const metaObj = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level.toUpperCase()}]: ${message}${metaObj}`;
});

// Configure the daily rotation file transport for production
const fileRotateTransport = new transports.DailyRotateFile({
  filename: path.join(__dirname, '../../logs/signaling-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: format.combine(
    format.timestamp(),
    logFormat
  )
});

// Configure Console Transport format
const consoleLogFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  logFormat
);

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Determine the log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'info';
};

// Create the logger instance
const logger = winston.createLogger({
  level: level(),
  levels,
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'signaling-server' },
  transports: [
    new transports.Console({ format: consoleLogFormat }),
    fileRotateTransport
  ],
  exitOnError: false
});

// Add request tracking with unique IDs
logger.requestLogger = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
  req.requestId = requestId;
  
  logger.http(`${req.method} ${req.url}`, { 
    requestId, 
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  
  next();
};

// Stream for Morgan HTTP request logging middleware
logger.stream = {
  write: (message) => logger.http(message.trim())
};

module.exports = logger;