import { z } from 'zod';

/**
 * Endpoint definition with Zod schemas for request/response validation.
 * Used by both server (validation) and client (typed calls + response parsing).
 */
export interface EndpointDefinition<
  TParams extends z.ZodTypeAny = z.ZodTypeAny,
  TQuery extends z.ZodTypeAny = z.ZodTypeAny,
  TBody extends z.ZodTypeAny = z.ZodTypeAny,
  TResponse extends z.ZodTypeAny = z.ZodTypeAny,
> {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  auth: boolean;
  params?: TParams;
  query?: TQuery;
  body?: TBody;
  response: TResponse;
}

/**
 * Define an endpoint with Zod schemas.
 * Provides type inference for params, query, body, and response.
 */
export function defineEndpoint<
  TParams extends z.ZodTypeAny = z.ZodTypeAny,
  TQuery extends z.ZodTypeAny = z.ZodTypeAny,
  TBody extends z.ZodTypeAny = z.ZodTypeAny,
  TResponse extends z.ZodTypeAny = z.ZodTypeAny,
>(
  config: EndpointDefinition<TParams, TQuery, TBody, TResponse>,
): EndpointDefinition<TParams, TQuery, TBody, TResponse> {
  return config;
}

/**
 * Extract inferred types from an endpoint definition.
 */
export type EndpointParams<T extends EndpointDefinition> = T['params'] extends z.ZodTypeAny
  ? z.infer<T['params']>
  : Record<string, never>;

export type EndpointQuery<T extends EndpointDefinition> = T['query'] extends z.ZodTypeAny
  ? z.infer<T['query']>
  : Record<string, never>;

export type EndpointBody<T extends EndpointDefinition> = T['body'] extends z.ZodTypeAny
  ? z.infer<T['body']>
  : Record<string, never>;

export type EndpointResponse<T extends EndpointDefinition> = T['response'] extends z.ZodTypeAny
  ? z.infer<T['response']>
  : never;

/**
 * Helper to create a Zod schema for a path parameter.
 * Identity function that preserves type inference.
 */
export const param = <T extends z.ZodTypeAny>(schema: T): T => schema;

/**
 * Helper to create a Zod schema for query parameters.
 * Identity function that preserves type inference.
 */
export const query = <T extends z.ZodTypeAny>(schema: T): T => schema;

/**
 * Helper to create a Zod schema for request body.
 * Identity function that preserves type inference.
 */
export const body = <T extends z.ZodTypeAny>(schema: T): T => schema;

/**
 * Helper to create a Zod schema for response.
 * Identity function that preserves type inference.
 */
export const response = <T extends z.ZodTypeAny>(schema: T): T => schema;

/**
 * Standard API error response shape.
 */
export const apiErrorSchema = z.object({
  message: z.string(),
  issues: z.array(z.unknown()).optional(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
