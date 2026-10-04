# LegoBot

Live at https://legobot.naurzalinov.me

Currently a placeholder FastAPI app (`app/main.py`) with two endpoints:

- `GET /` — "Coming soon" page
- `GET /health` — `{"status": "ok"}`

## Layout

```
app/main.py                          FastAPI app
requirements.txt                     Python dependencies
Dockerfile                           Image: uvicorn on port 8000
docker-compose.yml                   Runs the container, published on 127.0.0.1:6400
deploy/legobot.naurzalinov.me.conf   nginx site config (reverse proxy + HTTPS)
```

## Run locally

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Or with Docker:

```bash
docker compose up -d --build
curl localhost:6400/health
```

## Deploy

Traffic flow: `legobot.naurzalinov.me` → nginx (443, Let's Encrypt) → `127.0.0.1:6400` → container port 8000.

### Updating the running app

On the server, from the repo directory:

```bash
git pull
docker compose up -d --build
curl -s https://legobot.naurzalinov.me/health
```

The container uses `restart: unless-stopped`, so it comes back after reboots.

### First-time setup on a new server

Prerequisites: Docker with the compose plugin, nginx, certbot, and a DNS A record for `legobot.naurzalinov.me` pointing at the server.

1. Start the app:

   ```bash
   docker compose up -d --build
   ```

2. Install the nginx site. The committed config references certificates that won't exist yet on a fresh server, so start from the plain HTTP version:

   ```bash
   git show fb180f2:deploy/legobot.naurzalinov.me.conf | sudo tee /etc/nginx/sites-available/legobot.naurzalinov.me.conf
   sudo ln -s /etc/nginx/sites-available/legobot.naurzalinov.me.conf /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

3. Get the certificate (certbot adds the HTTPS block and the HTTP→HTTPS redirect):

   ```bash
   sudo certbot --nginx -d legobot.naurzalinov.me
   ```

4. Optionally copy the certbot-modified config back into the repo to keep them in sync:

   ```bash
   cp /etc/nginx/sites-available/legobot.naurzalinov.me.conf deploy/
   ```

Certbot's timer renews the certificate automatically.

### Changing the port

The host port `6400` appears in two places — keep them in sync:

- `docker-compose.yml` (`127.0.0.1:6400:8000`)
- `deploy/legobot.naurzalinov.me.conf` (`proxy_pass http://127.0.0.1:6400`)

After editing the nginx config, copy it to `/etc/nginx/sites-available/` and run `sudo nginx -t && sudo systemctl reload nginx`.

## Troubleshooting

- **502 Bad Gateway** — the container isn't running or isn't on port 6400: `docker compose ps`, `docker compose logs -f`.
- **Certificate issues** — `sudo certbot certificates`, `sudo certbot renew --dry-run`.
