import winston, { Logger } from "winston";
import pLimit from "p-limit";

const myFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

const loggerInstance: Logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    myFormat,
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "./data/combined.log" }),
  ],
});

export { loggerInstance as log };

export function promisesLimit() {
  return pLimit(10);
}

export class UnknownError extends Error {
  public readonly success: boolean = false;
  constructor(error: unknown) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido";
    super(message);
    this.name = "UnknownError";
  }

  toJSON() {
    return {
      message: this.message,
      success: this.success,
    };
  }
}
