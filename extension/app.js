import fixtures from './demo-data.js';
import { createState, applyAnalysis, transition, STATUS_LABELS, DECISIONS, canPreparePack, canDraft, composeDrafts } from './workflow.js';

let state = createState();
let view = 'import';
let selectedIssue = 'poa';
let draftTab = 'draftEmail';
let busy = false;
let clipboardFallback = '';
let lastRenderedView = null;
const root = document.querySelector('#app');
const extensionMode = location.protocol === 'chrome-extension:';
const endpoint = extensionMode ? 'http://localhost:8787' : location.origin;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const color = issue => ({ poa:'green', 'public-records':'blue', tax:'orange', 'advisory-council':'red' }[issue.id]);
const badge = issue => `<span class="badge ${color(issue)}">${esc(STATUS_LABELS[issue.status])}</span>`;
const button = (label, action, extra = '', className = '') => `<button class="${className}" data-action="${action}" ${extra}>${label}</button>`;

function toast(message) {
  const el = document.querySelector('#toast');
  el.textContent = message; el.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 5500);
}

function render() {
  const matter = state.matter;
  root.innerHTML = `<div class="shell">
    <header class="topbar"><div class="brand"><span class="mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>LegoBot<small>Negotiation control</small></div>
      <div class="topright"><span class="mode ${state.provenance !== 'Mistral' ? 'fallback' : ''}">${esc(state.provenance)}</span>${button('Reset demo','reset','','ghost small')}</div></header>
    <main class="content">
      <div class="crumb">MATTERS / NORTHSTAR V / <span>ATLAS</span></div>
      <div class="matter"><div><h1>${esc(matter.investor)}</h1><p class="sub">${esc(matter.fund)}</p>
        <div class="tags"><span class="tag">${esc(matter.investorType)}</span><span class="tag">${esc(matter.commitment)} commitment</span><span class="tag version">${esc(matter.sourceDocument)} ${esc(matter.currentVersion)}</span><span class="tag">Synthetic demo · simulated roles</span></div></div>
        ${state.analyzed && view !== 'overview' ? button('← Negotiation overview','overview','','ghost small') : ''}</div>
      ${view === 'import' ? importView() : view === 'overview' ? overviewView() : view === 'detail' ? detailView() : view === 'pack' ? packView() : draftsView()}
      ${state.analyzed ? auditView() : ''}
      <footer class="footer"><span>FIND · ROUTE · DECIDE · DRAFT · REMEMBER</span><span>All outputs require final lawyer review</span></footer>
    </main></div>`;
  const textarea = document.querySelector('#context');
  if (textarea) textarea.value = state.context;
  if (view !== lastRenderedView) window.scrollTo({ top: 0, behavior: 'instant' });
  lastRenderedView = view;
}

function importView() {
  return `<div class="intro"><div class="eyebrow">From document understanding to the next action</div><h2>Keep every decision attached<br>to the right context.</h2><p class="sub">Bring in the Legora analysis. Route the work, collect focused decisions, and prepare three aligned drafts for counsel.</p></div>
    <div class="import-grid"><section class="panel"><div class="eyebrow">01 / Import context</div><h2>Start with the Atlas matter</h2><p class="sub">This rehearsal uses four curated synthetic issues. Pasted analysis supplements that demo context.</p>
      ${button('Import selected Legora text','import-selection','','ghost small')}
      <label for="context">Paste Legora analysis here</label><textarea id="context" maxlength="24000" spellcheck="false"></textarea>
      <div class="actions">${button(busy ? 'Analyzing…' : 'Analyze with Mistral','analyze',busy ? 'disabled' : '', 'primary')}${button('Load demo context','load-demo',busy ? 'disabled' : '', 'ghost')}</div>
      <p class="hint">Mistral runs on the local server. If it is unavailable, the same full demo continues with bundled fixtures. Imported text is sent to Mistral when configured.</p>
      ${busy ? '<p class="loading" role="status">Structuring four requests · approvals remain human decisions</p>' : ''}</section>
    <aside class="panel"><div class="eyebrow">The negotiation loop</div><h2>Four requests.<br>Four different next steps.</h2><div class="route-list">
      <div class="route"><b>1</b><div><strong class="green">Draft / review</strong><p>The LPA already addresses the core request.</p></div></div>
      <div class="route"><b>2</b><div><strong class="blue">Start from precedent</strong><p>Evidence for a proposal; never automatic authority.</p></div></div>
      <div class="route"><b>3</b><div><strong class="orange">Route to Tax</strong><p>Focused review while other issues move in parallel.</p></div></div>
      <div class="route"><b>4</b><div><strong class="red">Ask the client</strong><p>A current commercial instruction for the exact wording.</p></div></div>
      </div><div class="warning">Precedent ≠ current authority.<br>Model output ≠ human decision.</div><p class="hint">Curated public-example patterns; synthetic names, excerpts and commitments. No source document ingestion.</p></aside></div>`;
}

function versionWarning() {
  const issue = state.issues.find(i => i.id === 'advisory-council');
  if (state.matter.currentVersion !== 'v4' || issue.status !== 'CLIENT_DECISION') return '';
  return `<section class="notice"><div class="eyebrow red">Material change detected</div><h3>Reopen client decision · the v3 instruction cannot clear v4</h3><p>The Advisory Council wording now asks for a voting appointment right. ${issue.previousDecision ? 'The previous client instruction was recorded against v3 and is stale.' : 'A new instruction is required against v4.'} The whole package must be signed off again.</p>
    ${issue.previousDecision ? `<p><strong>Previous v3 instruction · stale:</strong> ${esc(DECISIONS[issue.previousDecision.decision])}</p>` : ''}
    <div class="diff"><div><strong>V3 / PREVIOUS WORDING</strong>${esc(issue.previousRequest)}</div><div><strong>V4 / CURRENT WORDING</strong>${esc(issue.investorRequest)}</div></div>
    <p>Power of Attorney and Public Records work is unchanged. Tax's v3 review remains valid because its clause is unchanged.</p>
    ${button('Reopen Client Decision','detail','data-id="advisory-council"','primary')}</section>`;
}

function overviewView() {
  const completed = state.issues.filter(i => i.draftPrepared || ['PROPOSED_FROM_PRECEDENT','SPECIALIST_REVIEWED','CLIENT_APPROVED'].includes(i.status)).length;
  const tax = state.issues.find(i => i.id === 'tax');
  return `${versionWarning()}<div class="metrics"><div class="metric"><strong>04</strong><span>Requests identified</span></div><div class="metric"><strong class="green">${completed} / 4</strong><span>Prepared for client review</span></div><div class="metric"><strong class="orange">${tax.status === 'SPECIALIST_REVIEWED' ? 'Reviewed' : tax.status === 'IN_SPECIALIST_REVIEW' ? 'In progress' : 'Tax'}</strong><span>Specialist branch · parallel</span></div><div class="metric"><strong class="red">${state.issues.find(i => i.id === 'advisory-council').status === 'CLIENT_APPROVED' ? 'Recorded' : '01'}</strong><span>Current client instruction</span></div></div>
    <div class="section-head"><h2>Negotiation overview</h2><span class="hint">Each issue has its own authority trail</span></div>
    <div class="cards">${state.issues.map((issue, n) => `<button class="issue-card" data-action="detail" data-id="${issue.id}"><div class="card-top"><span class="issue-number">0${n+1} / ${esc(issue.requiredReviewer || 'COUNSEL')}</span>${badge(issue)}</div><h3>${esc(issue.title)}</h3><p>${esc(issue.reason)}</p><div class="card-footer"><span>${issue.draftPrepared ? 'Draft confirmation prepared' : issue.proposedPosition ? (issue.id === 'public-records' ? 'Current proposed Atlas position' : esc(issue.proposedPosition)) : esc(issue.sourceDocument + ' ' + issue.sourceVersion)}</span><span>Open issue ↗</span></div></button>`).join('')}</div>
    <div class="actions">${button('Prepare Client Review Pack','prepare-pack',canPreparePack(state) ? '' : 'disabled','primary')}${canDraft(state) ? button('Generate Final Drafts','generate-drafts',busy ? 'disabled' : '') : ''}${button('Simulate Investor v4','activate-v4',state.matter.currentVersion === 'v4' ? 'disabled' : '', 'ghost')}</div>
    <p class="hint">${canPreparePack(state) ? 'The whole product is ready for simulated client sign-off.' : 'Prepare the POA response, propose the precedent, complete Tax review, and record a client instruction to unlock the pack.'}</p>`;
}

function evidence(label, text, source = '') {
  return `<div class="evidence"><div class="eyebrow">${esc(label)}</div><p class="quote">${esc(text)}</p>${source ? `<span class="hint">${esc(source)}</span>` : ''}</div>`;
}

function detailView() {
  const issue = state.issues.find(i => i.id === selectedIssue);
  return `${issue.stale ? versionWarning() : ''}<div class="section-head"><h2>${esc(issue.title)}</h2>${badge(issue)}</div><div class="detail-grid">
    <section class="panel">${evidence('Investor request · ' + issue.sourceVersion, issue.investorRequest, issue.sourceDocument)}${evidence('LPA baseline', issue.lpaPosition, issue.lpaSource)}
      ${issue.precedents.map(p => `<div class="evidence"><div class="eyebrow">Executed precedent from another investor · synthetic</div><p class="quote">${esc(p.text)}</p><div class="tags"><span class="tag">${esc(p.investor)}</span><span class="tag">${esc(p.fund)}</span><span class="tag">${esc(p.commitment)} · ${esc(p.investorType)}</span><span class="tag">${p.status}</span></div><p class="hint">${esc(p.sourceDocument)}</p>${evidence('Applicability / commitment context',p.applicability)}</div>`).join('')}
      <p class="source-note">${esc(fixtures['demo-case'].sourceNote)}</p></section>
    <aside class="panel">${evidence('Why this next step',issue.reason)}${evidence('Suggested action',issue.nextAction)}
      ${issue.id === 'poa' ? poaActions(issue) : issue.id === 'public-records' ? precedentActions(issue) : issue.id === 'tax' ? taxActions(issue) : clientActions(issue)}
      <p class="hint">Decision scope: ${esc(state.matter.fund)} / ${esc(state.matter.investor)} / ${esc(issue.sourceDocument)} ${esc(issue.sourceVersion)}</p></aside></div>`;
}

function poaActions(issue) {
  return `${issue.draftPrepared ? `<div class="success"><strong>Draft confirmation prepared</strong><p class="hint">${esc(issue.draftResponse)}</p></div>` : button('Draft Response','prepare-poa','data-id="poa"','primary')}<div class="warning">Ready means drafting can progress. Counsel still reviews the wording.</div>`;
}
function precedentActions(issue) {
  return `<div class="warning"><strong>Precedent is evidence, not authority.</strong><br>Commitment size, fund, scope and MFN context may affect the client's position.</div>${issue.status === 'PRECEDENT' ? button('Use as Proposed Starting Position','propose-precedent','data-id="public-records"','primary') : `<div class="success"><strong>Current proposed Atlas position</strong><p class="hint">${esc(issue.proposedPosition)}</p><span>Included for whole-package client review.</span></div>`}`;
}
function taxActions(issue) {
  const review = issue.specialistReview;
  return `${evidence('Exact question for Tax',issue.specialistQuestion)}${!review ? button('Send to Tax','send-tax','data-id="tax"','primary') : `<div class="success"><strong>Tax Review Packet · ${esc(review.sourceVersion)}</strong><p class="hint">Matter: ${esc(review.fund)}<br>Investor: ${esc(review.investor)}<br>Document: ${esc(review.sourceDocument)} ${esc(review.sourceVersion)}<br>Issue: Tax Withholding<br>Sources: Atlas request + LPA baseline + executed precedent</p><p class="hint">${esc(review.question)}</p></div>${issue.status === 'IN_SPECIALIST_REVIEW' ? button('Simulate Tax Reply','tax-reply','data-id="tax"','primary') : `<div class="success"><strong>Specialist reviewed by Tax · ${esc(review.sourceVersion)}</strong><p class="hint">${esc(review.response)}</p>${state.matter.currentVersion !== review.sourceVersion ? '<p class="hint">Valid for unchanged Tax wording in v4.</p>' : ''}</div>`}`}<p class="hint">Simulated review packet; no email is sent. Specialist review is separate from commercial client sign-off.</p>`;
}
function clientActions(issue) {
  if (issue.status === 'CLIENT_APPROVED') return `<div class="success"><strong>${esc(issue.proposedPosition)}</strong><p class="hint">Recorded by Client (simulated) for ${esc(issue.sourceDocument)} ${esc(issue.humanDecision.sourceVersion)}. Whole-package approval is still a separate step.</p></div>`;
  return `<div class="warning">Why precedent is not enough: an executed governance right for another LP does not grant current authority for Atlas.</div><div class="eyebrow">Record simulated client instruction</div><div class="decision-options">${button('Reject','client-decision','data-id="advisory-council" data-decision="REJECT"','ghost')}${button('Observer / information rights only','client-decision','data-id="advisory-council" data-decision="OBSERVER_RIGHTS_ONLY"','primary')}${button('Accept nomination right','client-decision','data-id="advisory-council" data-decision="ACCEPT_NOMINATION"','ghost')}</div><p class="hint">${state.matter.currentVersion === 'v4' ? 'A nomination instruction is a narrower counterproposal to the requested voting seat.' : 'Appointment remains a client / GP matter.'}</p>`;
}

function packView() {
  const approved = canDraft(state);
  return `<div class="eyebrow">Whole product / ${esc(state.matter.currentVersion)}</div><h2>Client Review Pack</h2><p class="sub">The client sees every issue and the three linked work products, including points that did not need a separate client question.</p>
    <section class="panel" style="margin-top:20px">${state.issues.map(issue => `<div class="pack-row"><div><h3>${esc(issue.title)}</h3><p>${issue.id === 'poa' ? 'Draft confirmation prepared · ready for final lawyer review' : issue.id === 'public-records' ? 'Proposed from executed precedent; applicability remains for counsel to verify' : issue.id === 'tax' ? 'Tax reviewed for ' + esc(issue.specialistReview?.sourceVersion) + (state.matter.currentVersion === 'v4' ? ' · unchanged clause in v4' : '') : 'Client instruction: ' + esc(issue.proposedPosition)}</p></div>${badge(issue)}</div>`).join('')}
      <div class="warning">Sign-off covers the current package scope/version. All final wording still goes to the lawyer for review. No approval creates an executed precedent.</div>
      ${approved ? `<div class="success"><strong>Client package approved · ${esc(state.package.packageVersion)}</strong><p class="hint">Approved by Client (simulated). Instruction and Tax response are shared across all drafting products.</p></div><div class="actions">${button(busy ? 'Drafting…' : 'Generate Final Drafts','generate-drafts',busy ? 'disabled' : '', 'primary')}</div>` : state.package?.status === 'RETURNED_TO_LAWYER' ? `<div class="warning">Package returned to the lawyer. Recheck the work and prepare the pack again.</div>${button('Return to overview','overview','','primary')}` : `<div class="actions">${button('Approve Package','approve-package','','primary')}${button('Return to Lawyer','return-lawyer','','ghost')}</div>`}
    </section>`;
}

function draftsView() {
  if (!state.drafts || !canDraft(state)) return overviewView();
  const labels = { draftEmail:'Draft Email', commentsMemo:'Comments Memo', sideLetterChanges:'Side Letter Changes' };
  const copies = { draftEmail:'Copy Draft Email', commentsMemo:'Copy Comments Memo', sideLetterChanges:'Copy Side Letter Changes' };
  return `<div class="eyebrow">Three linked work products / ${esc(state.matter.currentVersion)}</div><h2>Aligned drafts. One recorded instruction.</h2><p class="sub">Client instruction: ${esc(DECISIONS[state.issues.find(i => i.id === 'advisory-council').humanDecision.decision])}</p>
    <section class="panel" style="margin-top:20px"><div class="tabs" role="tablist" aria-label="Draft products">${Object.entries(labels).map(([key,label]) => button(label,'draft-tab',`role="tab" aria-selected="${draftTab===key}" data-tab="${key}"`,'ghost')).join('')}</div>
      <div class="draft" role="tabpanel" aria-label="${labels[draftTab]}">${esc(state.drafts[draftTab])}</div><div class="actions">${button(copies[draftTab],'copy-draft',`data-tab="${draftTab}"`,'primary')}${button('Copy Full Review Package','copy-full','','ghost')}</div>
      <p class="hint">Paste email into Outlook if desired. Paste the memo / Side Letter changes into Legora or Word for final lawyer review. Transfers are manual.</p>
      ${clipboardFallback ? `<div class="copy-manual"><label for="manual-copy">Clipboard unavailable — select this text and press Ctrl+C</label><textarea id="manual-copy" readonly>${esc(clipboardFallback)}</textarea></div>` : ''}</section>
    <div class="actions">${button('Simulate Investor v4','activate-v4',state.matter.currentVersion==='v4' ? 'disabled' : '', 'ghost')}${button('Client Review Pack','open-pack','','ghost')}</div>`;
}

function auditView() {
  return `<details class="audit"><summary>Decision trail · ${state.audit.length} events · exact source/version scope</summary>${state.audit.map(event => `<div class="audit-row"><b>${esc(event.approvalType.replaceAll('_',' '))}</b> · ${esc(event.issue)} · ${esc(event.approvedBy)} (simulated)<br>${esc(event.fund)} / ${esc(event.investor)} / ${esc(event.sourceDocument)} ${esc(event.sourceVersion)}${event.decision ? '<br>Instruction: ' + esc(DECISIONS[event.decision]) : ''}</div>`).join('')}</details>`;
}

async function api(path, body) {
  const response = await fetch(`${endpoint}${path}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body), signal:AbortSignal.timeout(18000) });
  if (!response.ok) throw new Error('Backend unavailable');
  return response.json();
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('Copied. Paste into your normal tools for lawyer review.'); }
  catch { clipboardFallback = text; render(); document.querySelector('#manual-copy')?.select(); toast('Select the displayed text and press Ctrl+C.'); }
}
root.addEventListener('input', event => { if (event.target.id === 'context') state.context = event.target.value; });
root.addEventListener('click', async event => {
  const el = event.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const action = el.dataset.action;
  try {
    if (action === 'reset') { if (busy) return; state=createState(); view='import'; clipboardFallback=''; render(); return; }
    if (action === 'load-demo') { state.context=fixtures['demo-case'].legoraContext; render(); toast('Synthetic Atlas context loaded.'); return; }
    if (action === 'import-selection') {
      if (!extensionMode) { toast('Use the Chrome side panel for selection import, or paste the copied Legora analysis below.'); return; }
      const result = await chrome.runtime.sendMessage({type:'IMPORT_SELECTION'});
      if (result?.text) { state.context=result.text; render(); toast('Selected text imported.'); }
      else toast(result?.message || 'No text selected. Select in Legora or paste it manually.');
      return;
    }
    if (action === 'analyze') {
      if (busy) return;
      busy=true; render();
      try { state=applyAnalysis(state, await api('/api/analyze',{legoraContext:state.context,matter:state.matter})); }
      catch { state=applyAnalysis(state,null); }
      finally { busy=false; }
      view='overview'; render(); return;
    }
    if (action === 'overview') { view='overview'; render(); return; }
    if (action === 'detail') { selectedIssue=el.dataset.id; view='detail'; render(); return; }
    if (action === 'draft-tab') { draftTab=el.dataset.tab; render(); return; }
    if (action === 'copy-draft') { await copy(state.drafts[el.dataset.tab]); return; }
    if (action === 'copy-full') { await copy(`DRAFT EMAIL\n${state.drafts.draftEmail}\n\nCOMMENTS MEMO\n${state.drafts.commentsMemo}\n\nSIDE LETTER CHANGES\n${state.drafts.sideLetterChanges}`); return; }
    if (action === 'open-pack') { view='pack'; render(); return; }
    if (action === 'generate-drafts') {
      if (!canDraft(state) || busy) return;
      busy=true; render();
      try {
        const result=await api('/api/draft',{state});
        if (!['draftEmail','commentsMemo','sideLetterChanges'].every(key => typeof result[key]==='string' && result[key].length>30)) throw new Error('Invalid drafts');
        state.drafts=result; state.provenance=result.provenance || 'Demo-safe fallback';
      } catch { state.drafts=composeDrafts(state); state.provenance='Demo-safe fallback'; }
      finally { busy=false; }
      view='drafts'; draftTab='draftEmail'; clipboardFallback=''; render(); return;
    }
    const transitions = { 'prepare-poa':'PREPARE_POA','propose-precedent':'PROPOSE_PRECEDENT','send-tax':'SEND_TAX','tax-reply':'TAX_REPLY','client-decision':'CLIENT_DECISION','prepare-pack':'PREPARE_PACK','approve-package':'APPROVE_PACKAGE','return-lawyer':'RETURN_TO_LAWYER','activate-v4':'ACTIVATE_V4' };
    if (transitions[action]) {
      state=transition(state,transitions[action],{id:el.dataset.id,decision:el.dataset.decision});
      if (action==='prepare-pack') view='pack';
      if (action==='activate-v4') { view='overview'; clipboardFallback=''; }
      render();
      const messages={'send-tax':'Tax packet prepared. Continue the other issues in parallel.','tax-reply':'Simulated Tax review recorded for the exact v3 clause.','client-decision':'Client instruction recorded for the current source version.','approve-package':'Simulated client package sign-off recorded.','activate-v4':'Only the Advisory Council issue reopened. Old drafts and package sign-off were invalidated.'};
      if (messages[action]) toast(messages[action]);
    }
  } catch(error) { toast(error.message || 'Complete the current workflow step first.'); }
});
render();
