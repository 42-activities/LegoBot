# Small by design

The same `extension/sidepanel.html` serves the localhost web app and MV3 side panel. `data/*.json` are canonical synthetic fixtures; `scripts/build-fixtures.js` bundles them for offline use. No external scripts, fonts or packages.

`extension/workflow.js` contains pure transitions, source-scope validation, version fixtures and deterministic drafting. State/audit events are in memory; reload resets the demo. Reviews/instructions record fund, investor, issue, document, version, exact clause and actor. Whole-package sign-off covers the current version.

v4 is a deterministic fixture, not real diffing. Only Advisory Council changes. Its old client instruction becomes stale and remains in the audit trail. The unchanged Tax review survives. Whole-product sign-off and old drafts are invalidated.

`extension/live-workflow.js` adds a separate real-source review. It accepts 1–12 issues with exact quotes present in imported Legora text, checks source scope, and requires operator-recorded specialist responses/client instructions and package sign-off. Missing LPA support and unestablished executed precedent are routed to a client decision. Reanalysis clears old decisions and drafts. Human response/instruction text is inserted unchanged into all three products; proposed model wording still requires lawyer review.

`server/server.js` is a dependency-free Node HTTP server with `/health`, `/api/analyze`, `/api/draft`. Mistral uses a private environment key, fixed endpoint, JSON mode and 14-second timeout. Demo mode falls back to bundled fixtures. Real mode returns explicit errors without substituting fixtures; the browser preserves source text and decisions. AI may set only four initial route states, never human authority. In the demo, governance wording is assembled from the client instruction in all outputs.

Only an explicitly selected Legora text is read after a user click, using `activeTab`/`scripting` with an exact origin check. No cookies, tokens, scraping or private API access. Manual paste always remains available. The server serves only packaged extension assets, never configuration files, and limits cross-origin requests.

Demo roles are simulated; real mode records responses/instructions that the operator obtains externally. There is no authentication, identity verification, email delivery, document write API, database, RAG, OCR or file ingestion. Imported analysis and recorded positions are sent to Mistral when the user runs analysis or drafting. Keep exposed deployments on synthetic data. Persistent in-app Back navigation changes the view without undoing workflow records; mode switching keeps separate in-memory reviews.
