import { z } from 'zod';
import { appDataSchema, isValidTimeZone } from '../domain/types';

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});
export type AccountUser = z.infer<typeof userSchema>;
export const sessionSchema = z.object({ user: userSchema.nullable() });
export const workspaceSchema = z.object({
  data: appDataSchema,
  timeZone: z.string().refine(isValidTimeZone),
  empty: z.boolean().optional(),
});

export async function accountRequest<T>(
  endpoint: string,
  method: string,
  body: unknown,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(
      new URL(
        `api/${endpoint}`,
        new URL(import.meta.env.BASE_URL, document.baseURI),
      ),
      {
        method,
        credentials: 'same-origin',
        signal,
        ...(body !== undefined
          ? {
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            }
          : {}),
      },
    );
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(
      'We could not reach the account service. Check the connection and try again.',
    );
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = z.object({ error: z.string().max(300) }).safeParse(payload);
    throw new Error(
      message.success
        ? message.data.error
        : 'This request could not be completed. Please try again.',
    );
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success)
    throw new Error(
      'The account service returned an unexpected response. Please try again.',
    );
  return parsed.data;
}

export const okSchema = z.object({ ok: z.boolean() });
