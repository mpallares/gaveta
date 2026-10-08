/**
 * Tiny logger. Rule: never pass chat text (titles, messages) here. Only codes,
 * counts and ids. Everything is prefixed so it can be filtered in DevTools.
 */
type Meta = Record<string, string | number | boolean | null | undefined>;

const PREFIX = '[gaveta]';

export const log = {
  debug(scope: string, event: string, meta?: Meta): void {
    if (import.meta.env?.DEV) console.debug(PREFIX, scope, event, meta ?? '');
  },
  info(scope: string, event: string, meta?: Meta): void {
    console.info(PREFIX, scope, event, meta ?? '');
  },
  warn(scope: string, event: string, meta?: Meta): void {
    console.warn(PREFIX, scope, event, meta ?? '');
  },
  /** Pass only `error.name`/code, never `error.message` from fetch bodies. */
  error(scope: string, event: string, meta?: Meta): void {
    console.error(PREFIX, scope, event, meta ?? '');
  },
};

/** Safe summary of an unknown thrown value for logs. */
export function errorKind(e: unknown): string {
  if (e instanceof Error) return e.name;
  return typeof e;
}
