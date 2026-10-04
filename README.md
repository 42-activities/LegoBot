# LegoBot

Find. Route. Decide. Draft. Remember.

Four synthetic investment-funds issues, parallel Tax review, version-scoped client instructions, a whole-product review pack, and three aligned drafts. All outputs require final lawyer review.

## Launch on Windows

Node 20+ required; no dependencies to install.

```powershell
cd C:\Users\VictorRedMi\Desktop\Legora\LegoBot\server
npm start
```

Open **http://localhost:8787** for the complete web workflow. For real Mistral, copy `.env.example` to an ignored `.env.local` in the repository root and enter the key privately. A root `.env` is also supported; variable names are case-insensitive and `.env.local` takes precedence. Restart the server. The key stays server-side; `MISTRAL_MODEL` defaults to `mistral-small-latest`.

## Chrome side panel

1. Open `chrome://extensions`; enable Developer Mode.
2. **Load unpacked** -> `C:\Users\VictorRedMi\Desktop\Legora\LegoBot\extension`.
3. Pin LegoBot. Open `https://app.eu.legora.com/`; click the LegoBot toolbar icon.
4. Select analysis in Legora -> **Import selected Legora text**, or paste manually.
5. **Analyze with Mistral**. **Load demo context** gives a predictable rehearsal.

Only user-selected text is read after a click. No Legora API, page scraping or token access. The extension bundles all fixtures and works even with the backend stopped. An already-loaded web page also works after stopping the server; a fresh web load requires the server.

## Demo sequence

Analyze -> **Power of Attorney / Draft Response** -> **Public Records / Use as Proposed Starting Position** -> **Tax / Send to Tax** -> **Advisory Council / Observer / information rights only** while Tax is pending -> **Tax / Simulate Tax Reply** -> **Prepare Client Review Pack** -> **Approve Package** -> **Generate Final Drafts** -> show/copy three tabs -> **Simulate Investor v4**.

Only Advisory Council reopens. The Tax v3 review survives for its unchanged clause. Old whole-package sign-off and drafts are invalidated. Record a fresh v4 instruction and approve the new package to draft again.

**Tax replies, client instructions and package approval are simulated roles.** No messages are sent. Copy email to Outlook or memo / Side Letter suggestions to Legora or Word manually. Precedent is evidence, not current authority. Proposed, reviewed, client-approved and executed states remain distinct.

## Verify

```powershell
cd C:\Users\VictorRedMi\Desktop\Legora\LegoBot
npm test
npm run build:fixtures
```

See [demo script](docs/DEMO_SCRIPT.md), [architecture](docs/ARCHITECTURE.md) and [verification](docs/VERIFICATION.md). Fixtures are synthetic summaries of public-example patterns, not verbatim legal extracts. No raw PDFs or transcripts are included. This is a fixed four-issue demo, not a general document-analysis system.

Mistral JSON is validated. Timeout, invalid output, unavailable backend or network failure activates **Demo-safe fallback**. Governance text is assembled from the recorded client instruction in every draft so model prose cannot change it. State is in memory; reload resets the demo.

## Deploy

Pushes to `main` deploy automatically (`.github/workflows/pipeline.yml`): tests run, an arm64 image is pushed to `ghcr.io/42-activities/legobot-app`, then the server checkout at `~/projects/LegoBot` is moved to the new commit and the container restarted. If `/health` fails, it rolls back to the previous image. Pull requests only test and build.

Required repository secrets: `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, optionally `SSH_KNOWN_HOSTS` and `ENV_FILE` (the server `.env`, e.g. `MISTRAL_API_KEY`). Compose keeps `127.0.0.1:6400:8000`, so the existing nginx proxy still applies.

Manual fallback on the host:

```bash
git pull
docker compose up -d --build
curl localhost:6400/health
```

Exposed demos have no authentication or verified human identity; use only synthetic data.
