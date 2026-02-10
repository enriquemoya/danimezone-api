import type { Application, NextFunction, Request, Response } from "express";
import fs from "fs";
import path from "path";
import morgan from "morgan";
import winston from "winston";

const logDir = path.join(process.cwd(), "logs");
const logFile = path.join(logDir, "runtime.log");
const accessLogFile = path.join(logDir, "access.log");

function ensureLogDir() {
  fs.mkdirSync(logDir, { recursive: true });
}

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => {
      return `${timestamp} ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: logFile }),
    new winston.transports.Console()
  ]
});

export function logStartup() {
  ensureLogDir();
  const env = process.env.ENVIROMENT || process.env.NODE_ENV || "undefined";
  logger.info(`[startup] pid=${process.pid} env=${env}`);
}

export function attachRuntimeLogging(app: Application) {
  ensureLogDir();

  const accessLogStream = fs.createWriteStream(accessLogFile, { flags: "a" });
  app.use(morgan("combined", { stream: accessLogStream }));

  app.use(
    morgan(":method :url :status :res[content-length] - :response-time ms", {
      stream: {
        write: (message: string) => logger.info(message.trim())
      }
    })
  );

  app.use((err: unknown, req: Request, _res: Response, next: NextFunction) => {
    const msg =
      err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : "unknown error";
    logger.error(`error ${req.method} ${req.originalUrl}: ${msg}`);
    next(err);
  });
}
