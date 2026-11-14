import { randomBytes } from 'node:crypto';
import { chmod } from 'node:fs/promises';
import { join } from 'node:path';

const MIN_LENGTH = 32;

type LoadedSecret = { secret: string; generated: boolean };

type SecretSource = {
  /** `DRECK_SECRET` */
  secret?: string;
  /** `DRECK_SECRET_FILE`, e.g. a Docker or Kubernetes secret */
  secretFile?: string;
};

function checkLength(secret: string, name: string): string {
  if (secret.length < MIN_LENGTH) {
    throw new Error(`${name} must be at least ${MIN_LENGTH} characters long`);
  }
  return secret;
}

/**
 * The instance secret: `DRECK_SECRET` or the content of `DRECK_SECRET_FILE` (at least 32
 * characters), otherwise `<dataDir>/secret`, generated on the first start.
 */
export async function loadSecret(
  { secret, secretFile }: SecretSource,
  dataDir: string,
): Promise<LoadedSecret> {
  if (secret !== undefined)
    return { secret: checkLength(secret, 'DRECK_SECRET'), generated: false };

  if (secretFile !== undefined) {
    const file = Bun.file(secretFile);
    if (!(await file.exists())) throw new Error(`DRECK_SECRET_FILE ${secretFile} does not exist`);
    return {
      secret: checkLength((await file.text()).trim(), 'DRECK_SECRET_FILE'),
      generated: false,
    };
  }

  const file = Bun.file(join(dataDir, 'secret'));
  if (await file.exists()) return { secret: (await file.text()).trim(), generated: false };

  const generated = randomBytes(32).toString('base64url');
  await Bun.write(file, `${generated}\n`);
  await chmod(join(dataDir, 'secret'), 0o600);
  return { secret: generated, generated: true };
}
