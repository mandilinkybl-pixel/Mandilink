const winston = require("winston");
const { format, transports } = winston;
const { combine, timestamp, label, printf, errors, json } = format;
const path = require("path");
const DailyRotateFile = require("winston-daily-rotate-file");

// Custom log format
const logFormat = printf(({ level, message, label: lbl, timestamp: ts, stack, ...meta }) => {
  let msg = `${ts} [${lbl}] ${level}: ${message}`;
  
  if (stack) {
    msg += `\n${stack}`;
  }
  
  if (meta && Object.keys(meta).length) {
    msg += `\n${JSON.stringify(meta, null, 2)}`;
  }
  
  return msg;
});

// Environment-based configuration
const isDevelopment = process.env.NODE_ENV !== "production";

// Create transports
const transportsArray = [];

// Console transport (development)
if (isDevelopment) {
  transportsArray.push(
    new transports.Console({
      level: "debug",
      format: combine(
        label({ label: "DEV" }),
        timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        errors({ stack: true }),
        format.colorize(),
        logFormat
      )
    })
  );
} else {
  // File transports (production)
  
  // Error logs
  transportsArray.push(
    new DailyRotateFile({
      filename: path.join(process.env.LOG_DIR || "logs", "error-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
      level: "error",
      format: combine(
        label({ label: "PROD" }),
        timestamp(),
        errors({ stack: true }),
        json()
      )
    })
  );
  
  // Combined logs
  transportsArray.push(
    new DailyRotateFile({
      filename: path.join(process.env.LOG_DIR || "logs", "combined-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
      level: "info",
      format: combine(
        label({ label: "PROD" }),
        timestamp(),
        errors({ stack: true }),
        json()
      )
    })
  );
  
  // HTTP access logs
  transportsArray.push(
    new DailyRotateFile({
      filename: path.join(process.env.LOG_DIR || "logs", "http-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
      level: "info",
      format: combine(
        label({ label: "HTTP" }),
        timestamp(),
        json()
      )
    })
  );
}

// Main logger instance
const logger = winston.createLogger({
  level: isDevelopment ? "debug" : "info",
  format: combine(
    errors({ stack: true }),
    timestamp()
  ),
  defaultMeta: { service: "subscription-service" },
  transports: transportsArray
});

// Add console transport for production errors
if (!isDevelopment) {
  logger.add(
    new transports.Console({
      level: "error",
      format: combine(
        timestamp(),
        json()
      )
    })
  );
}

// HTTP request logger middleware
logger.http = (req, res, meta) => {
  logger.info("HTTP Request", {
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get("User-Agent"),
    userId: req.user?.userId || "anonymous",
    responseTime: res.get("X-Response-Time") || "unknown",
    statusCode: res.statusCode,
    ...meta
  });
};

// Custom stream for Morgan (HTTP logging)
logger.stream = {
  write: (message) => logger.http(null, null, { message })
};

// Subscription-specific loggers
logger.subscription = {
  create: (subscriptionId, userId, planId, amount) => {
    logger.info("Subscription Created", {
      subscriptionId,
      userId,
      planId,
      amount,
      action: "create"
    });
  },

  activate: (subscriptionId, paymentId, amount) => {
    logger.info("Subscription Activated", {
      subscriptionId,
      paymentId,
      amount,
      action: "activate"
    });
  },

  renew: (subscriptionId, paymentId, amount, success = true) => {
    logger[success ? "info" : "warn"]("Subscription Renewal", {
      subscriptionId,
      paymentId,
      amount,
      success,
      action: "renew"
    });
  },

  cancel: (subscriptionId, userId, reason) => {
    logger.info("Subscription Cancelled", {
      subscriptionId,
      userId,
      reason: reason || "user_initiated",
      action: "cancel"
    });
  },

  paymentFailed: (subscriptionId, attempt, error) => {
    logger.error("Payment Failed", {
      subscriptionId,
      attempt,
      error: error.message,
      stack: error.stack,
      action: "payment_failed"
    });
  }
};

// Payment-specific loggers
logger.payment = {
  methodAdded: (userId, methodId, last4, type) => {
    logger.info("Payment Method Added", {
      userId,
      methodId,
      last4,
      type,
      action: "method_added"
    });
  },

  methodRemoved: (userId, methodId) => {
    logger.info("Payment Method Removed", {
      userId,
      methodId,
      action: "method_removed"
    });
  }
};

// Error handlers
logger.errorHandler = (error, context = {}) => {
  logger.error("Application Error", {
    error: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
};

// Request ID middleware logger
logger.request = (req, res, next) => {
  const requestId = req.headers["x-request-id"] || 
                   req.headers["request-id"] || 
                   `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  req.requestId = requestId;
  
  const start = Date.now();
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    res.set("X-Response-Time", duration);
    
    logger.info("Request Completed", {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.userId,
      ip: req.ip
    });
  });
  
  next();
};

// Export logger with helpers
module.exports = {
  logger,
  
  // Convenience methods
  info: (message, meta = {}) => logger.info(message, { ...meta, requestId: meta.requestId }),
  error: (message, meta = {}) => logger.error(message, { ...meta, requestId: meta.requestId }),
  warn: (message, meta = {}) => logger.warn(message, { ...meta, requestId: meta.requestId }),
  debug: (message, meta = {}) => logger.debug(message, { ...meta, requestId: meta.requestId }),
  
  // Subscription helpers
  logSubscriptionCreate: logger.subscription.create.bind(logger.subscription),
  logSubscriptionActivate: logger.subscription.activate.bind(logger.subscription),
  logSubscriptionRenew: logger.subscription.renew.bind(logger.subscription),
  logSubscriptionCancel: logger.subscription.cancel.bind(logger.subscription),
  logPaymentFailed: logger.subscription.paymentFailed.bind(logger.subscription),
  
  // Payment helpers
  logPaymentMethodAdded: logger.payment.methodAdded.bind(logger.payment),
  logPaymentMethodRemoved: logger.payment.methodRemoved.bind(logger.payment),
  
  // Middleware
  request: logger.request,
  stream: logger.stream,
  
  // Error handler
  errorHandler: logger.errorHandler
};