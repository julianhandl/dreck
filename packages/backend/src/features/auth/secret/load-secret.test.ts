import { describe, expect, test } from 'bun:test';
import { mkdtemp, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadSecret } from './load-secret';

const tempDir = (): Promise<string> => mkdtemp(join(tmpdir(), 'dreck-secret-'));

describe('loadSecret', () => {
  test('DRECK_SECRET wins', async () => {
    const secret = 'x'.repeat(32);
    expect(await loadSecret({ secret }, await tempDir())).toEqual({ secret, generated: false });
  });

  test('DRECK_SECRET under 32 characters aborts', async () => {
    await expect(loadSecret({ secret: 'x'.repeat(31) }, await tempDir())).rejects.toThrow(
      'DRECK_SECRET must be at least 32',
    );
  });

  test('DRECK_SECRET_FILE is read and trimmed, nothing is generated', async () => {
    const dir = await tempDir();
    const secretFile = join(dir, 'mounted-secret');
    await Bun.write(secretFile, `${'y'.repeat(40)}\n`);

    expect(await loadSecret({ secretFile }, dir)).toEqual({
      secret: 'y'.repeat(40),
      generated: false,
    });
    expect(await Bun.file(join(dir, 'secret')).exists()).toBe(false);
  });

  test('missing DRECK_SECRET_FILE aborts', async () => {
    const dir = await tempDir();
    await expect(loadSecret({ secretFile: join(dir, 'missing') }, dir)).rejects.toThrow(
      'does not exist',
    );
  });

  test('DRECK_SECRET_FILE under 32 characters aborts', async () => {
    const dir = await tempDir();
    const secretFile = join(dir, 'short');
    await Bun.write(secretFile, 'short\n');
    await expect(loadSecret({ secretFile }, dir)).rejects.toThrow(
      'DRECK_SECRET_FILE must be at least 32',
    );
  });

  test('without either it is generated once into <dataDir>/secret', async () => {
    const dir = await tempDir();
    const first = await loadSecret({}, dir);
    expect(first.generated).toBe(true);
    expect(first.secret.length).toBeGreaterThanOrEqual(32);
    expect((await stat(join(dir, 'secret'))).mode & 0o777).toBe(0o600);

    const second = await loadSecret({}, dir);
    expect(second).toEqual({ secret: first.secret, generated: false });
  });
});
