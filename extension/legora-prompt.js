export const LEGORA_REVIEW_PROMPT = `Review the uploaded LPA and Side Letter for a negotiation workflow demonstration.

Use only these uploaded documents. If they are public models, templates, samples or documents from different funds, state that explicitly and do not present them as one executed transaction or current investor instruction.

Identify up to eight concrete requests or clauses that a funds lawyer would need to address. For each, provide:
1. Issue title.
2. Source document name, section and page where available.
3. Exact quoted request or Side Letter clause (no paraphrase in the quote).
4. The LPA baseline, with an exact supporting quote if available. If not available say "not provided".
5. Any relevant historical wording actually supplied, with its source and execution status. A sample or draft is not executed precedent. Do not invent history.
6. Whether the point appears to need specialist review or a client/commercial instruction, and the precise question.

Distinguish document provisions from new investor requests. Do not manufacture approval, commitment thresholds, signed status or client instructions. Explain gaps or differences between the supplied sources. Keep the response concise, in English, and preserve source quotations for manual import into LegoNego. Do not create final legal advice or a binding position.`;
