# LegoNego

Find. Route. Decide. Draft. Remember.

LegoNego is a local web application and a Chrome side-panel extension for negotiation workflows. Legora holds and reviews your contracts. You copy its analysis into LegoNego, where Mistral structures source-grounded issues for specialist review, client instructions, whole-package sign-off and three consistent proposed work products. All outputs require final lawyer review.

The product was renamed from LegoBot. Existing folder, GitHub repository, Docker service and deployment hostname names remain compatible.

## Start the local application

Node 20+ is required; no dependencies need installing.

```powershell
cd C:\Users\VictorRedMi\Desktop\Legora\LegoBot
npm start
```

Open [LegoNego on localhost](http://localhost:8787). Persistent **← Back**, **Import / source context** and **Negotiation overview** controls let you move between screens without discarding the review. State stays in browser memory; reloading clears it. Switching modes keeps each review and unfinished import text during the current session.

## Where to put the contract

**Upload documents to your project in [Legora](https://app.eu.legora.com/).** LegoNego receives the analysis you copy from Legora. It does not upload files to Legora or read DOCX/PDF files itself.

1. Sign in to Legora, open the intended project and upload the LPA and Side Letter using its document upload controls.
2. In LegoNego, choose **Real Legora analysis → Copy Legora Review Prompt**. A manually copyable prompt is also available on screen.
3. Run that prompt in Legora against the uploaded documents, retaining exact quotes and document/section references.
4. Paste Legora's response into LegoNego. Enter the fund/matter, investor/counterparty, source document names and version. Click **Analyze with Mistral**.
5. A successful result displays **Mistral · live** and lists issues from your text. Check every quote against the originals. Samples and drafts do not establish executed precedent.
6. Prepare supported responses or proposed precedent positions. Prepare specialist packets, obtain actual responses outside the app and record the reviewer name and response. Obtain actual client instructions and record the actor name and instruction.
7. Prepare the Client Review Pack. After the client/partner reviews the whole package outside the app, record their name and sign-off. Generate the proposed email, comments memo and Side Letter wording/instructions.
8. Copy drafts back to Legora/Word for lawyer review and the email to your mail application. LegoNego does not send messages or authenticate recorded people.

Reanalysis starts a new review and clears old decisions. Live analysis requires source quotes; Mistral cannot create human approvals. Recorded specialist responses and client instructions appear unchanged in all three products. This prototype does not create an executed agreement or a Word tracked-changes file.

See [the full Legora workflow and public-file examples](docs/LEGORA_WORKFLOW.md).

## Mistral configuration and current limitation

Copy `.env.example` to ignored `.env.local` in the repository root and enter the key privately:

```dotenv
MISTRAL_API_KEY=your_private_key
MISTRAL_MODEL=mistral-small-latest
```

A repository-root `.env` also works. Variable names are case-insensitive. `.env.local` takes precedence over `.env`; the process environment takes precedence over files. Restart after configuration changes. Keys stay on the server. Imported text and recorded positions are sent to Mistral when you run analysis or drafting.

On 4 October 2026 the configured key reached Mistral but returned **HTTP 429: Rate limit exceeded**, including a minimal probe. A successful live end-to-end review could not be verified. Check organization model limits and workspace usage/spending caps in Mistral's Admin Panel. The response alone does not identify the account limit reached. See [Mistral usage limits](https://docs.mistral.ai/admin/billing-usage/usage-limits).

```powershell
node scripts/check-mistral.js
```

**Real mode shows API failures and preserves imported text/decisions. It never substitutes demo issues.** The separately labelled demo can use fixtures when Mistral or the backend is unavailable.

## Chrome extension

1. Open `chrome://extensions` and enable Developer Mode.
2. Choose **Load unpacked** and select `C:\Users\VictorRedMi\Desktop\Legora\LegoBot\extension`.
3. Pin **LegoNego**. Open Legora and click the toolbar icon to open the side panel.
4. Select text in Legora and click **Import selected Legora text**, or paste manually.
5. Choose **Real Legora analysis** for actual source text. Keep the local server running for Mistral.

For an existing installation, click **Reload** on its extension card and reopen the side panel. Refresh localhost to load the new application.

Selection import reads only text explicitly selected on `https://app.eu.legora.com/` after your click. There is no private Legora API integration. Web and extension interfaces share the same workflow. Offline demo fixtures are bundled into the extension; a fresh localhost page load requires the server.

## Present the demo

Choose **Demo rehearsal → Load demo context → Analyze with Mistral**. Four synthetic Atlas/Northstar issues have predictable routes and visibly labelled fallback results.

Prepare POA → propose Public Records precedent → send to Tax → record the Advisory Council observer-only choice while Tax is pending → simulate Tax reply → prepare and approve the whole pack → generate/copy three drafts → simulate investor v4. Only Advisory Council reopens; the unchanged Tax review survives. Fresh governance instruction and package sign-off are required before drafting again.

Demo Tax replies, client decisions and approval are simulated. Present the real workflow separately and claim live Mistral success only when **Mistral · live** appears. See [demo script](docs/DEMO_SCRIPT.md).

## Verification

```powershell
npm test
npm run build:fixtures
```

See [architecture](docs/ARCHITECTURE.md) and [verification](docs/VERIFICATION.md). No credentials, raw contracts or client analysis are included in Git. Demo fixtures are synthetic, not verbatim legal extracts. User-entered identities are not verified; there is no persistence or multi-user access control.

## Deployment and existing Docker host

The repository's existing GitHub Actions pipeline runs tests on pushes to `main`, builds an arm64 image at `ghcr.io/42-activities/legobot-app`, and deploys to the configured server checkout at `~/projects/LegoBot`. Pull requests test/build without deploying. Deployment checks `/health` and attempts rollback if the new stack fails.

The existing pipeline requires repository secrets `SSH_HOST`, `SSH_USER` and `SSH_PRIVATE_KEY`; optional `SSH_KNOWN_HOSTS` and `ENV_FILE` configure host verification and the server environment. Workflow definitions are in `.github/workflows/pipeline.yml` and `docker-deploy.yml`. A push starts this automation; it is not proof that deployment succeeded.

Docker serves Node on port 8000. Compose retains `127.0.0.1:6400:8000` and the existing nginx proxy.

```bash
git pull
docker compose up -d --build
curl localhost:6400/health
```

Set `MISTRAL_API_KEY` and optionally `MISTRAL_MODEL` in that host's private environment. No manual remote deployment was performed. Use synthetic material on an exposed unauthenticated demo.
