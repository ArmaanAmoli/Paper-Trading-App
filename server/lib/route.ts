import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { EndpointDefinition } from '../../../../shared/contract/define.js';
import { verifyToken } from './auth.js';
import { AppError, toApiError } from './errors.js';
import { getEnv } from './env.js';

/**
 * Generic route handler that validates request against Zod schemas
 * and calls the handler with parsed, typed values.
 */
export function route<
  TParams extends z.ZodTypeAny,
  TQuery extends z.ZodTypeAny,
  TBody extends z.ZodTypeAny,
  TResponse extends z.ZodTypeAny
>(
  endpoint: EndpointDefinition<z.ZodTypeAny, z.ZodTypeAny, z.ZodTypeAny, z.ZodTypeAny>,
  handler: (input: {
    params: z.infer<TParams>;
    query: z.infer<TQuery>;
    body: z.infer<TBody>;
    user: { userId: string; email: string };
  }) => Promise<z.infer<TResponse>>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse params
      const params = endpoint.params
        ? endpoint.params.parse(req.params)
        : ({} as z.infer<TParams>);

      // Parse query
      const query = endpoint.query
        ? endpoint.query.parse(req.query)
        : ({} as z.infer<TQuery>);

      // Parse body
      const body = endpoint.body
        ? endpoint.body.parse(req.body)
        : ({} as z.infer<TBody>);

      // Verify JWT if auth required
      let user: { userId: string; email: string } | undefined;
      if (endpoint.auth) {
        const payload = verifyToken(req as any);
        user = { userId: payload.userId, email: payload.email };
      }

      // Call handler with validated input
      const result = await handler({
        params,
        query,
        body,
        user: user!,
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
        const error = new Error('Validation failed');
        (error as any).statusCode = 400;
        (error as any).issues = err.errors;
        next(error);
      } else {
        next(err);
      }
    }
  };
}
