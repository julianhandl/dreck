import { ErrorSchema } from '@dreck/shared/api/common';
import { z } from '@hono/zod-openapi';

export const IdParamsSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive()
    .openapi({ param: { name: 'id', in: 'path' }, example: 1 }),
});

/** Response entry with a JSON body. */
export function json<T extends z.ZodType>(
  schema: T,
  description: string,
): { content: { 'application/json': { schema: T } }; description: string } {
  return { content: { 'application/json': { schema } }, description };
}

/** Request body entry with a JSON body. */
export function jsonBody<T extends z.ZodType>(
  schema: T,
): { content: { 'application/json': { schema: T } }; required: true } {
  return { content: { 'application/json': { schema } }, required: true };
}

/** Error response entry. */
export function error(description: string): ReturnType<typeof json<typeof ErrorSchema>> {
  return json(ErrorSchema, description);
}
