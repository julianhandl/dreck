import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

export type Config = {
  port: number;
  dataDir: string;
  /** `DRECK_SECRET`, unset if empty. */
  secret?: string;
  /** `DRECK_SECRET_FILE`, unset if empty. */
  secretFile?: string;
};

type Env = Record<string, string | undefined>;

/** Empty strings count as unset, so compose's `${VAR:-}` behaves like a missing variable. */
function fromEnv(env: Env, name: string): string | undefined {
  const value = env[name];
  return value === '' ? undefined : value;
}

/** Server configuration: CLI flag before environment variable before default. */
export function loadConfig(args: string[], env: Env): Config {
  const { values } = parseArgs({
    args,
    options: {
      'data-dir': { type: 'string' },
      port: { type: 'string' },
    },
  });

  const portText = values.port ?? fromEnv(env, 'DRECK_PORT') ?? '3000';
  const port = Number(portText);
  if (!/^\d+$/.test(portText) || port < 1 || port > 65535) {
    throw new Error(`Port must be a number from 1 to 65535, got "${portText}"`);
  }

  const secret = fromEnv(env, 'DRECK_SECRET');
  const secretFile = fromEnv(env, 'DRECK_SECRET_FILE');
  if (secret !== undefined && secretFile !== undefined) {
    throw new Error('Set either DRECK_SECRET or DRECK_SECRET_FILE, not both');
  }

  return {
    port,
    dataDir: resolve(values['data-dir'] ?? fromEnv(env, 'DRECK_DATA_DIR') ?? '/data'),
    secret,
    secretFile,
  };
}
