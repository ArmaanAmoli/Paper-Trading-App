import { z } from 'zod';

// Standard API error response shape (matches shared/contract/define.ts)
export const apiErrorSchema = z.object({
  message: z.string(),
  issues: z.array(z.unknown()).optional(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

// Custom error classes
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public override readonly message: string,
    public readonly issues?: unknown[],
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, issues: unknown[]) {
    super(400, message, issues);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(409, message);
    this.name = 'ConflictError';
  }
}

export class InsufficientFundsError extends AppError {
  constructor(message = 'Insufficient funds') {
    super(422, message);
    this.name = 'InsufficientFundsError';
  }
}

export class InsufficientMarginError extends AppError {
  constructor(message = 'Insufficient margin for short position') {
    super(422, message);
    this.name = 'InsufficientMarginError';
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

export function toApiError(err: unknown): ApiError {
  if (isAppError(err)) {
    return {
      message: err.message,
      issues: err.issues,
    };
  }
  if (err instanceof Error) {
    return { message: err.message };
  }
  return { message: 'Internal server error' };
}
