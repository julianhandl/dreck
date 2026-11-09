import { describe, expect, test } from 'bun:test';
import { mkdtemp, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadSecret } from './load-secret';

const tempDir = (): Promise<string> => mkdtemp(join(tmpdir(), 'dreck-secret-'));

describe('loadSecret', () => {
  test('DRECK_SECRET wins', async () => {
    const secret = 'x'.repeat(32);
    expect(await loadSecret(secret, await tempDir())).toEqual({ secret, generated: false });
  });

  test('DRECK_SECRET under 32 characters aborts', async () => {
    await expect(loadSecret('x'.repeat(31), await tempDir())).rejects.toThrow('at least 32');
  });

  test('without DRECK_SECRET it is generated once into <dataDir>/secret', async () => {
    const dir = await tempDir();
    const first = await loadSecret(undefined, dir);
    expect(first.generated).toBe(true);
    expect(first.secret.length).toBeGreaterThanOrEqual(32);
    expect((await stat(join(dir, 'secret'))).mode & 0o777).toBe(0o600);

    const second = await loadSecret(undefined, dir);
    expect(second).toEqual({ secret: first.secret, generated: false });
  });
});
