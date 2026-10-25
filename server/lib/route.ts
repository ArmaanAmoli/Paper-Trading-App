import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { EndpointDefinition } from '@shared/contract/define.js';
import { verifyToken } from './auth.js';
import { AppError } from './errors.js';

/**
 * Generic route handler that validates request against Zod schemas
 * and calls the handler with parsed, typed values.
 */
export function route<
  TParams extends z.ZodTypeAny,
  TQuery extends z.ZodTypeAny,
  TBody extends z.ZodTypeAny,
  TResponse extends z.ZodTypeAny,
>(
  endpoint: EndpointDefinition<TParams, TQuery, TBody, TResponse>,
  handler: (input: {
    params: z.output<TParams>;
    query: z.output<TQuery>;
    body: z.output<TBody>;
    user: { userId: string; email: string };
  }) => Promise<z.output<TResponse>>,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse params
      const params = endpoint.params
        ? endpoint.params.parse(req.params)
        : ({} as z.output<TParams>);

      // Parse query
      const query = endpoint.query ? endpoint.query.parse(req.query) : ({} as z.output<TQuery>);

      // Parse body
      const body = endpoint.body ? endpoint.body.parse(req.body) : ({} as z.output<TBody>);

      // Verify JWT if auth required
      let user: { userId: string; email: string } | undefined;
      if (endpoint.auth) {
        const payload = verifyToken(req);
        user = { userId: payload.userId, email: payload.email };
      }

      // Call handler with validated input
      const result = await handler({
        params,
        query,
        body,
        user: user as { userId: string; email: string },
      });

      // In development, validate response against schema
      if (process.env.NODE_ENV !== 'production') {
        const responseResult = endpoint.response.safeParse(result);
        if (!responseResult.success) {
          console.error('Contract drift detected:', responseResult.error.flatten());
        }
      }

      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const error = new AppError(400, 'Validation failed', err.issues);
        next(error);
      } else {
        next(err);
      }
    }
  };
}
