import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InsufficientFundsError,
  InsufficientMarginError,
  isAppError,
  toApiError,
} from '../lib/errors.ts';

describe('AppError subclasses', () => {
  it('AppError sets statusCode, message, and name', () => {
    const err = new AppError(418, "I'm a teapot");
    expect(err.statusCode).toBe(418);
    expect(err.message).toBe("I'm a teapot");
    expect(err.name).toBe('AppError');
    expect(err instanceof Error).toBe(true);
  });

  it('ValidationError defaults to 400 and carries issues', () => {
    const err = new ValidationError('Validation failed', [{ path: ['symbol'], message: 'required' }]);
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('Validation failed');
    expect(err.name).toBe('ValidationError');
    expect(err.issues).toEqual([{ path: ['symbol'], message: 'required' }]);
  });

  it('UnauthorizedError defaults to 401', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Unauthorized');
    expect(err.name).toBe('UnauthorizedError');
  });

  it('ForbiddenError defaults to 403', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('Forbidden');
    expect(err.name).toBe('ForbiddenError');
  });

  it('NotFoundError defaults to 404', () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err.name).toBe('NotFoundError');
  });

  it('ConflictError defaults to 409', () => {
    const err = new ConflictError();
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe('Conflict');
    expect(err.name).toBe('ConflictError');
  });

  it('InsufficientFundsError defaults to 422', () => {
    const err = new InsufficientFundsError();
    expect(err.statusCode).toBe(422);
    expect(err.message).toBe('Insufficient funds');
    expect(err.name).toBe('InsufficientFundsError');
  });

  it('InsufficientMarginError defaults to 422', () => {
    const err = new InsufficientMarginError();
    expect(err.statusCode).toBe(422);
    expect(err.message).toBe('Insufficient margin for short position');
    expect(err.name).toBe('InsufficientMarginError');
  });
});

describe('isAppError', () => {
  it('returns true for AppError instances', () => {
    expect(isAppError(new AppError(400, 'x'))).toBe(true);
    expect(isAppError(new NotFoundError())).toBe(true);
  });

  it('returns false for plain Errors', () => {
    expect(isAppError(new Error('plain'))).toBe(false);
    expect(isAppError('string')).toBe(false);
    expect(isAppError(null)).toBe(false);
    expect(isAppError(undefined)).toBe(false);
  });
});

describe('toApiError', () => {
  it('maps AppError to { message, issues }', () => {
    expect(toApiError(new ValidationError('bad', [{ path: ['x'] }]))).toEqual({
      message: 'bad',
      issues: [{ path: ['x'] }],
    });
  });

  it('maps plain Error to { message } without issues', () => {
    expect(toApiError(new Error('boom'))).toEqual({ message: 'boom' });
  });

  it('maps non-Error values to Internal server error', () => {
    expect(toApiError(null)).toEqual({ message: 'Internal server error' });
    expect(toApiError('oops')).toEqual({ message: 'Internal server error' });
  });
});
