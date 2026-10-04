import { execFileSync } from 'node:child_process';
const files=execFileSync('git',['diff','--cached','--name-only','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const tokenPattern=/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|mstrl_[A-Za-z0-9_-]{20,})\b|(?:MISTRAL_API_KEY|GITHUB_TOKEN|GITHUB_PAT)\s*=\s*["']?[A-Za-z0-9_-]{24,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;
let failed=false;
for(const file of files) {
  if (/\.(?:pdf|docx)$/i.test(file) || /(^|\/)\.env(?!\.example$)/.test(file) || /(?:browser-data|local-state)\//.test(file)) {
    console.error('Blocked source, environment or session file in staged changes.'); failed=true; continue;
  }
  let content;
  try { content=execFileSync('git',['show',`:${file}`],{encoding:'utf8',maxBuffer:5*1024*1024}); }
  catch { continue; } // Deleted files have no staged blob.
  if(tokenPattern.test(content)) { console.error('Potential credential detected; values and paths suppressed.'); failed=true; }
}
if(failed) process.exitCode=1;
else console.log(`Staged safety scan passed (${files.length} files; no credential matches or raw documents).`);
