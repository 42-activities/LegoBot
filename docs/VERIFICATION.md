# Verification

Automated checks cover workflow gates, AI authority rejection, all governance choices, source-scoped decisions, package return/sign-off, v4 invalidation and reapproval, stale/mismatched-source rejection, Mistral JSON transport and errors, API fallback/success, static file boundaries, CORS and MV3 entry points.

On 4 October 2026, all 13 automated checks passed. The localhost UI was rehearsed twice in the Codex in-app browser, once with the Node server running in safe mode and once with the server intentionally stopped after page load.

Manual paste, all four issue cards, POA drafting without approval, proposing precedent without approval, focused Tax packet/reply, client instruction while Tax was pending, all-four-issue package sign-off, all three aligned draft tabs and all four clipboard buttons were verified. The v4 warning reopened only Advisory Council, preserved Tax's unchanged v3 clause/review, and invalidated old package sign-off/drafts. The offline rehearsal passed all ten checkpoints. A 400px-wide layout had no horizontal overflow.

MV3 manifest permissions and referenced files passed structural checks. No connected Chrome session was available, so loading the extension in Chrome, opening its actual side panel and importing a real Legora selection remain manual verification steps. The mixed-case Mistral variable in the parent workspace's `.env` was found and copied privately into ignored `.env.local`. Live synthetic analysis and drafting calls reached Mistral but received HTTP 429; both endpoints activated safe fallback and all three output instructions stayed aligned. Injected successful JSON, unsafe model output, invalid JSON and network failures were tested at the transport/API boundaries. Docker deployment to the existing host was not performed.

Ignored local screenshots are in `artifacts/overview.jpg` and `artifacts/v4-reopened.jpg`. `node scripts/check-staged.js` scans staged changes for credentials, environment/session files and raw source documents without printing matches.
