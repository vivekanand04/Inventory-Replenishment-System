import { randomUUID } from "crypto";
import { Request, Response, NextFunction } from "express";

export type LogLevel = "info" | "warn" | "error";

type LogContext = {
  correlationId?: string;
  [key: string]: unknown;
};

const log = (level: LogLevel, message: string, context: LogContext = {}): void => {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(entry));
};

export const logger = {
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext) => log("warn", message, context),
  error: (message: string, context?: LogContext) => log("error", message, context)
};

export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const existing = req.header("x-correlation-id");
  const correlationId = existing && existing.length > 0 ? existing : randomUUID();
  (req as Request & { correlationId: string }).correlationId = correlationId;
  res.setHeader("x-correlation-id", correlationId);
  next();
};

