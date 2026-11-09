import { z } from '@hono/zod-openapi';

export const LoginSchema = z.object({ password: z.string() });

export type Login = z.infer<typeof LoginSchema>;
