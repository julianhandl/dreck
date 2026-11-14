# Self-hosting

The image runs as a personal setup without any configuration, see the [README](../README.md). This page covers running Dreck inside existing infrastructure: behind your own reverse proxy, several instances on one host, or Kubernetes.

## Configuration

| Variable | Flag | Default | Meaning |
|---|---|---|---|
| `DRECK_PORT` | `--port` | `3000` | HTTP port inside the container. |
| `DRECK_DATA_DIR` | `--data-dir` | `/data` | Database, generated secret and migration backups. |
| `DRECK_SECRET` | – | – | Instance secret, at least 32 characters. |
| `DRECK_SECRET_FILE` | – | – | Path to a file holding the secret, e.g. a Docker or Kubernetes secret. Surrounding whitespace is ignored. |

- A flag wins over its variable. Empty variables count as unset.
- Set at most one of `DRECK_SECRET` and `DRECK_SECRET_FILE`. With neither, Dreck generates a secret into `<DRECK_DATA_DIR>/secret` on the first start.
- Inside the container, change the port with `DRECK_PORT`, not `--port`: the health check reads the variable.
- Dreck speaks plain HTTP and logs to stdout. TLS belongs to the reverse proxy.

## Health check

`GET /api/health` answers `{"ok":true}` without authentication. The image has a `HEALTHCHECK` on it, so `docker ps` shows `healthy` once Dreck has applied migrations and listens.

## Image tags

| Tag | Follows |
|---|---|
| `latest` | every commit on `main` |
| `1.2.3`, `1.2`, `1` | releases (Git tag `v1.2.3`) |
| `sha-<short commit>` | one exact build |

For servers you update deliberately, pin a release tag such as `1.2` instead of `latest`.

## Behind your own reverse proxy

Run only the app and let your proxy reach it. The proxy must pass the original `Host` header on (Caddy and Traefik do this by default; nginx needs `proxy_set_header Host $host;`). Dreck derives the `Secure` flag of the session cookie from it.

```yaml
services:
  app:
    image: ghcr.io/julianhandl/dreck:1
    restart: unless-stopped
    read_only: true
    environment:
      DRECK_SECRET_FILE: /run/secrets/dreck
    secrets:
      - dreck
    volumes:
      - dreck-data:/data
    # Either publish to the host for a proxy there …
    ports:
      - "127.0.0.1:3000:3000"
    # … or join the proxy's network instead and drop `ports`
    # networks: [proxy]

secrets:
  dreck:
    file: ./dreck-secret.txt

volumes:
  dreck-data:
```

Create the secret file with `openssl rand -base64 32 > dreck-secret.txt`. Without Swarm, Compose mounts it with the host's owner and permissions, so it must be readable for UID 1000.

## Several instances on one host

Dreck is single-user: each person gets their own container with their own volume and secret. Give each instance its own subdomain (`alice.example.com`, `bob.example.com`); serving Dreck under a path such as `example.com/alice` is not supported. Session cookies are bound to the host, so instances on different subdomains do not interfere.

```yaml
x-dreck: &dreck
  image: ghcr.io/julianhandl/dreck:1
  restart: unless-stopped
  read_only: true

services:
  alice:
    <<: *dreck
    ports: ["127.0.0.1:3001:3000"]
    volumes: [alice-data:/data]
  bob:
    <<: *dreck
    ports: ["127.0.0.1:3002:3000"]
    volumes: [bob-data:/data]

volumes:
  alice-data:
  bob-data:
```

Each instance prints its generated secret once: `docker compose logs alice`.

## Kubernetes and OpenShift

- **Exactly one replica** per instance, with `strategy: Recreate`. The database is a SQLite file and the brake on failed logins lives in memory; two pods on one volume corrupt data.
- **Volume:** a `ReadWriteOnce` volume on `/data`. Network file systems that do not honour file locks (some NFS setups) are not safe for SQLite.
- **User:** the image runs as user `bun` (UID 1000). `/data` is writable for group 0 as well, so random UIDs as on OpenShift work. On plain Kubernetes with another UID, set `securityContext.fsGroup`.
- **Read-only root file system** works; Dreck writes only to `/data`.
- **Secret:** mount a Kubernetes secret as a file and point `DRECK_SECRET_FILE` at it.
- **Probes:** `httpGet` on `/api/health`, port 3000, for both liveness and readiness. Migrations run before the port opens, so give the startup probe some slack after an update.
- **Shutdown:** Dreck stops cleanly on `SIGTERM`.
- **Backups:** `GET /api/v1/backup` with `Authorization: Bearer <secret>` returns a consistent snapshot while Dreck runs, which suits a CronJob.
