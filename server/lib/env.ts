import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  MONGO_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  FAST_API_SERVER_DOMAIN: z.string().url(),
  FAST_API_WEB_SOCKET_SERVER_DOMAIN: z.string().url(),
  JWT_TOKEN_05_2036: z.string().min(1),
  WEB_PUSH_PUBLIC_KEY: z.string().min(1),
  WEB_PUSH_PRIVATE_KEY: z.string().min(1),
  EXCHANGE_RATE_API: z.string().min(1),
  VITE_API_BASE_URL: z.string().url(),
  VITE_WEB_PUSH_PUBLIC_KEY: z.string().min(1),
  // Google OAuth (optional - server starts without them but OAuth won't work)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),
  FRONTEND_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

export function getEnv(): Env {
  if (!env) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error('Invalid environment variables:', result.error.flatten().fieldErrors);
      process.exit(1);
    }
    env = result.data;
  }
  return env;
}
