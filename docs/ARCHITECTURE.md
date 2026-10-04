# Small by design

The same `extension/sidepanel.html` serves the localhost web app and MV3 side panel. `data/*.json` are canonical synthetic fixtures; `scripts/build-fixtures.js` bundles them for offline use. No external scripts, fonts or packages.

`extension/workflow.js` contains pure transitions, source-scope validation, version fixtures and deterministic drafting. State/audit events are in memory; reload resets the demo. Reviews/instructions record fund, investor, issue, document, version, exact clause and actor. Whole-package sign-off covers the current version.

v4 is a deterministic fixture, not real diffing. Only Advisory Council changes. Its old client instruction becomes stale and remains in the audit trail. The unchanged Tax review survives. Whole-product sign-off and old drafts are invalidated.

`server/server.js` is a dependency-free Node HTTP server with `/health`, `/api/analyze`, `/api/draft`. Mistral uses a private environment key, fixed endpoint, JSON mode and 14-second timeout. Backend and browser both fall back automatically. AI may set only four initial route states, never human authority. Governance wording is assembled from the client instruction in all outputs; model prose cannot override it.

Only an explicitly selected Legora text is read after a user click, using `activeTab`/`scripting` with an exact origin check. No cookies, tokens, scraping or private API access. Manual paste always remains available. The server serves only packaged extension assets, never configuration files, and limits cross-origin requests.

Human roles are simulated. There is no authentication, production identity verification, email delivery, document write API, database, RAG, OCR or ingestion. Imported text is sent to Mistral only when configured and the user clicks Analyze; rehearse with synthetic text. Keep exposed deployments on synthetic data.
