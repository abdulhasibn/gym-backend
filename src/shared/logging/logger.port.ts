/**
 * The only logging type Presentation/Application code may depend on.
 * Infrastructure provides the concrete implementation (see infrastructure/logging/logger.ts);
 * nothing outside infrastructure may import the concrete logging library directly.
 */
export interface LogContext {
  readonly [key: string]: unknown;
}

export interface Logger {
  info(context: LogContext, message: string): void;
  info(message: string): void;
  warn(context: LogContext, message: string): void;
  warn(message: string): void;
  error(context: LogContext, message: string): void;
  error(message: string): void;
  child(bindings: LogContext): Logger;
}
