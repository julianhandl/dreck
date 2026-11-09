import { randomBytes } from 'node:crypto';
import { chmod } from 'node:fs/promises';
import { join } from 'node:path';

const MIN_LENGTH = 32;

type LoadedSecret = { secret: string; generated: boolean };

/**
 * The instance secret: `DRECK_SECRET` if set (at least 32 characters), otherwise `<dataDir>/secret`,
 * generated on the first start.
 */
export async function loadSecret(
  fromEnv: string | undefined,
  dataDir: string,
): Promise<LoadedSecret> {
  if (fromEnv !== undefined && fromEnv !== '') {
    if (fromEnv.length < MIN_LENGTH) {
      throw new Error(`DRECK_SECRET must be at least ${MIN_LENGTH} characters long`);
    }
    return { secret: fromEnv, generated: false };
  }

  const file = Bun.file(join(dataDir, 'secret'));
  if (await file.exists()) return { secret: (await file.text()).trim(), generated: false };

  const secret = randomBytes(32).toString('base64url');
  await Bun.write(file, `${secret}\n`);
  await chmod(join(dataDir, 'secret'), 0o600);
  return { secret, generated: true };
}
