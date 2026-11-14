import { describe, expect, test } from 'bun:test';
import { resolve } from 'node:path';
import { loadConfig } from './config';

describe('loadConfig', () => {
  test('defaults fit the image', () => {
    expect(loadConfig([], {})).toEqual({
      port: 3000,
      dataDir: '/data',
      secret: undefined,
      secretFile: undefined,
    });
  });

  test('environment variables override defaults', () => {
    const config = loadConfig([], {
      DRECK_PORT: '8080',
      DRECK_DATA_DIR: 'relative/dir',
      DRECK_SECRET_FILE: '/run/secrets/dreck',
    });
    expect(config).toEqual({
      port: 8080,
      dataDir: resolve('relative/dir'),
      secret: undefined,
      secretFile: '/run/secrets/dreck',
    });
  });

  test('CLI flags override environment variables', () => {
    const config = loadConfig(['--port', '4000', '--data-dir', '/srv/dreck'], {
      DRECK_PORT: '8080',
      DRECK_DATA_DIR: '/elsewhere',
    });
    expect(config.port).toBe(4000);
    expect(config.dataDir).toBe('/srv/dreck');
  });

  test('empty variables count as unset', () => {
    const config = loadConfig([], { DRECK_PORT: '', DRECK_SECRET: '', DRECK_SECRET_FILE: '' });
    expect(config.port).toBe(3000);
    expect(config.secret).toBeUndefined();
    expect(config.secretFile).toBeUndefined();
  });

  test.each(['abc', '0', '65536', '30.5', '-1'])('port "%s" aborts', (port) => {
    expect(() => loadConfig([], { DRECK_PORT: port })).toThrow('Port must be');
  });

  test('DRECK_SECRET and DRECK_SECRET_FILE together abort', () => {
    expect(() =>
      loadConfig([], { DRECK_SECRET: 'x'.repeat(32), DRECK_SECRET_FILE: '/run/secrets/dreck' }),
    ).toThrow('not both');
  });
});
