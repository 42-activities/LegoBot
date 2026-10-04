import fixtures from './demo-data.js';
import { createState, applyAnalysis, transition as transitionDemo, STATUS_LABELS, DECISIONS, canPreparePack as canPrepareDemoPack, canDraft as canDraftDemo, composeDrafts } from './workflow.js';
import { createLiveState, validateMatter, applyLiveAnalysis, transitionLive, canPrepareLivePack, canDraftLive } from './live-workflow.js';
import { LEGORA_REVIEW_PROMPT } from './legora-prompt.js';

let state = createState();
let view = 'import';
let selectedIssue = 'poa';
let draftTab = 'draftEmail';
let busy = false;
let clipboardFallback = '';
let lastRenderedView = null;
let viewHistory = [];
let lastRenderedPage = null;
let navigatingBack = false;
let intakeText = state.context;
let liveMatterForm = structuredClone(createLiveState().matter);
let demoSnapshot = state;
let liveSnapshot = createLiveState();
let liveError = '';
let demoIntake = intakeText;
let liveIntake = '';
let liveInputs = {};
const isLive = () => state.mode === 'live';
const canPreparePack = value => value.mode === 'live' ? canPrepareLivePack(value) : canPrepareDemoPack(value);
const canDraft = value => value.mode === 'live' ? canDraftLive(value) : canDraftDemo(value);
const transition = (value,action,payload) => value.mode === 'live' ? transitionLive(value,action,payload) : transitionDemo(value,action,payload);
const root = document.querySelector('#app');
const extensionMode = location.protocol === 'chrome-extension:';
const endpoint = extensionMode ? 'http://localhost:8787' : location.origin;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const color = issue => ({ poa:'green', 'public-records':'blue', tax:'orange', 'advisory-council':'red' }[issue.id]) || ({READY:'green',PRECEDENT:'blue',PROPOSED_FROM_PRECEDENT:'blue',SPECIALIST_REVIEW:'orange',IN_SPECIALIST_REVIEW:'orange',SPECIALIST_REVIEWED:'orange',CLIENT_DECISION:'red',CLIENT_APPROVED:'red'}[issue.status]);
const badge = issue => `<span class="badge ${color(issue)}">${esc(isLive() && issue.status==='IN_SPECIALIST_REVIEW' ? 'Specialist packet prepared' : isLive() && issue.status==='SPECIALIST_REVIEWED' ? 'Specialist response recorded' : STATUS_LABELS[issue.status])}</span>`;
const button = (label, action, extra = '', className = '') => `<button class="${className}" data-action="${action}" ${extra}>${label}</button>`;

function toast(message) {
  const el = document.querySelector('#toast');
  el.textContent = message; el.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 5500);
}

function render() {
  if (lastRenderedPage && view !== lastRenderedPage.view && !navigatingBack) viewHistory.push(lastRenderedPage);
  navigatingBack = false;
  lastRenderedPage = { view, selectedIssue, draftTab };
  const matter = state.matter;
  root.innerHTML = `<div class="shell">
    <header class="topbar"><div class="brand"><span class="mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>LegoNego<small>Negotiation control</small></div>
      <div class="topright"><span class="mode ${state.provenance.startsWith('Mistral') ? '' : 'fallback'}">${esc(state.provenance)}</span>${button(isLive() ? 'New review' : 'Reset demo','reset','','ghost small')}</div></header>
    <nav class="workflow-nav" aria-label="Workflow navigation">${button('← Back','back',viewHistory.length && !busy ? '' : 'disabled','ghost small')}${button('Import / source context','intake',busy ? 'disabled' : '','ghost small')}${button('Negotiation overview','overview',state.analyzed && !busy ? '' : 'disabled','ghost small')}${state.package ? button('Client Review Pack','open-pack',busy ? 'disabled' : '','ghost small') : ''}</nav>
    <main class="content">
      <div class="crumb">${isLive() ? 'MATTERS / <span>REAL CONTRACT REVIEW</span>' : 'MATTERS / NORTHSTAR V / <span>ATLAS</span>'}</div>
      <div class="matter"><div><h1>${esc(matter.investor || 'Real contract review')}</h1><p class="sub">${esc(matter.fund || 'Import the analysis from your Legora project')}</p>
        <div class="tags"><span class="tag">${esc(matter.investorType)}</span><span class="tag">${esc(matter.commitment)} commitment</span><span class="tag version">${esc(matter.sourceDocument || 'Source to be entered')} ${esc(matter.currentVersion)}</span><span class="tag">${isLive() ? 'Imported source text · user-recorded decisions' : 'Synthetic demo · simulated roles'}</span></div></div>
        ${state.analyzed && view !== 'overview' ? button('← Negotiation overview','overview','','ghost small') : ''}</div>
      ${view === 'import' ? importView() : view === 'overview' ? overviewView() : view === 'detail' ? detailView() : view === 'pack' ? packView() : draftsView()}
      ${state.analyzed ? auditView() : ''}
      <footer class="footer"><span>FIND · ROUTE · DECIDE · DRAFT · REMEMBER</span><span>All outputs require final lawyer review</span></footer>
    </main></div>`;
  const textarea = document.querySelector('#context');
  if (textarea) textarea.value = intakeText;
  for(const input of document.querySelectorAll('[data-matter]')) input.value=liveMatterForm[input.dataset.matter]||'';
  for(const input of document.querySelectorAll('[data-form-key]')) input.value=liveInputs[input.dataset.formIssue]?.[input.dataset.formKey]||'';
  if (view !== lastRenderedView) window.scrollTo({ top: 0, behavior: 'instant' });
  lastRenderedView = view;
}

function importView() {
  const modes=`<div class="tabs" aria-label="Analysis mode">${button('Demo rehearsal','switch-mode',`data-mode="demo" aria-pressed="${!isLive()}" ${busy?'disabled':''}`,!isLive()?'primary':'ghost')}${button('Real Legora analysis','switch-mode',`data-mode="live" aria-pressed="${isLive()}" ${busy?'disabled':''}`,isLive()?'primary':'ghost')}</div>`;
  if(isLive()) return liveImportView(modes);
  return `${modes}<div class="intro"><div class="eyebrow">From document understanding to the next action</div><h2>Keep every decision attached<br>to the right context.</h2><p class="sub">Bring in the Legora analysis. Route the work, collect focused decisions, and prepare three aligned drafts for counsel.</p></div>
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

function liveImportView(modes) {
  return `${modes}<div class="intro"><div class="eyebrow">Legora → Mistral → recorded decisions → lawyer review</div><h2>Review your actual contract context.</h2><p class="sub">Upload the documents in Legora first. LegoNego receives the analysis you explicitly copy or select; source quotations anchor each issue.</p></div>
  <div class="import-grid"><section class="panel"><h2>Import Legora's analysis</h2>${liveError?`<div class="notice" role="alert"><h3>Live Mistral unavailable</h3><p>${esc(liveError)}</p></div>`:''}
    <div class="matter-form">${[['fund','Fund / matter name'],['investor','Investor / counterparty'],['sourceDocument','Source document name(s)'],['sourceVersion','Source version']].map(([key,label])=>`<div><label for="matter-${key}">${label}</label><input id="matter-${key}" data-matter="${key}" maxlength="200"></div>`).join('')}</div>
    <div class="actions">${button('Import selected Legora text','import-selection','','ghost small')}${button('Paste clipboard text','paste-clipboard','','ghost small')}</div>
    <label for="context">Paste Legora analysis here</label><textarea id="context" maxlength="24000" spellcheck="false" placeholder="Include exact source quotations and document / section references from Legora."></textarea>
    <div class="actions">${button(busy?'Analyzing actual source…':'Analyze with Mistral','analyze',busy?'disabled':'','primary')}</div>
    <p class="hint">This sends your pasted text to Mistral through the local server. It does not substitute the Atlas demo when the API fails. Reanalysis starts a new review and clears previous decisions for that source.</p></section>
  <aside class="panel"><div class="eyebrow">Before you analyze</div><h2>Start in Legora</h2><ol class="workflow-steps"><li>Open your Legora project and upload the LPA and Side Letter.</li><li>Copy the review prompt below into Legora and run its review.</li><li>Copy the response, including exact quotes, into this text box.</li><li>Enter the matter, investor and document version. Run Mistral, then resolve the issue routes.</li></ol><div class="actions"><a class="link-button" href="https://app.eu.legora.com/" target="_blank" rel="noopener noreferrer">Open Legora ↗</a>${button('Copy Legora Review Prompt','copy-legora-prompt','','ghost')}</div><details><summary>Read / manually copy the Legora review prompt</summary><pre class="prompt-text">${esc(LEGORA_REVIEW_PROMPT)}</pre></details><p class="hint">Public examples available locally: ILPA model LPA and MEABF sample Side Letter. Samples may concern different funds; they are not executed precedent or a single transaction.</p><div class="warning">A real Mistral result displays “Mistral · live”. Human review and sign-off are recorded manually; no messages or approvals are sent to other people.</div></aside></div>`;
}

function versionWarning() {
  if(isLive()) return '';
  const issue = state.issues.find(i => i.id === 'advisory-council');
  if (state.matter.currentVersion !== 'v4' || issue.status !== 'CLIENT_DECISION') return '';
  return `<section class="notice"><div class="eyebrow red">Material change detected</div><h3>Reopen client decision · the v3 instruction cannot clear v4</h3><p>The Advisory Council wording now asks for a voting appointment right. ${issue.previousDecision ? 'The previous client instruction was recorded against v3 and is stale.' : 'A new instruction is required against v4.'} The whole package must be signed off again.</p>
    ${issue.previousDecision ? `<p><strong>Previous v3 instruction · stale:</strong> ${esc(DECISIONS[issue.previousDecision.decision])}</p>` : ''}
    <div class="diff"><div><strong>V3 / PREVIOUS WORDING</strong>${esc(issue.previousRequest)}</div><div><strong>V4 / CURRENT WORDING</strong>${esc(issue.investorRequest)}</div></div>
    <p>Power of Attorney and Public Records work is unchanged. Tax's v3 review remains valid because its clause is unchanged.</p>
    ${button('Reopen Client Decision','detail','data-id="advisory-council"','primary')}</section>`;
}

function overviewView() {
  if(isLive()) return liveOverviewView();
  const completed = state.issues.filter(i => i.draftPrepared || ['PROPOSED_FROM_PRECEDENT','SPECIALIST_REVIEWED','CLIENT_APPROVED'].includes(i.status)).length;
  const tax = state.issues.find(i => i.id === 'tax');
  return `${versionWarning()}<div class="metrics"><div class="metric"><strong>04</strong><span>Requests identified</span></div><div class="metric"><strong class="green">${completed} / 4</strong><span>Prepared for client review</span></div><div class="metric"><strong class="orange">${tax.status === 'SPECIALIST_REVIEWED' ? 'Reviewed' : tax.status === 'IN_SPECIALIST_REVIEW' ? 'In progress' : 'Tax'}</strong><span>Specialist branch · parallel</span></div><div class="metric"><strong class="red">${state.issues.find(i => i.id === 'advisory-council').status === 'CLIENT_APPROVED' ? 'Recorded' : '01'}</strong><span>Current client instruction</span></div></div>
    <div class="section-head"><h2>Negotiation overview</h2><span class="hint">Each issue has its own authority trail</span></div>
    <div class="cards">${state.issues.map((issue, n) => `<button class="issue-card" data-action="detail" data-id="${issue.id}"><div class="card-top"><span class="issue-number">0${n+1} / ${esc(issue.requiredReviewer || 'COUNSEL')}</span>${badge(issue)}</div><h3>${esc(issue.title)}</h3><p>${esc(issue.reason)}</p><div class="card-footer"><span>${issue.draftPrepared ? 'Draft confirmation prepared' : issue.proposedPosition ? (issue.id === 'public-records' ? 'Current proposed Atlas position' : esc(issue.proposedPosition)) : esc(issue.sourceDocument + ' ' + issue.sourceVersion)}</span><span>Open issue ↗</span></div></button>`).join('')}</div>
    <div class="actions">${button('Prepare Client Review Pack','prepare-pack',canPreparePack(state) ? '' : 'disabled','primary')}${canDraft(state) ? button('Generate Final Drafts','generate-drafts',busy ? 'disabled' : '') : ''}${button('Simulate Investor v4','activate-v4',state.matter.currentVersion === 'v4' ? 'disabled' : '', 'ghost')}</div>
    <p class="hint">${canPreparePack(state) ? 'The whole product is ready for simulated client sign-off.' : 'Prepare the POA response, propose the precedent, complete Tax review, and record a client instruction to unlock the pack.'}</p>`;
}

function liveOverviewView() {
  const prepared=state.issues.filter(i=>i.draftPrepared||['PROPOSED_FROM_PRECEDENT','SPECIALIST_REVIEWED','CLIENT_APPROVED'].includes(i.status)).length;
  const specialist=state.issues.filter(i=>['SPECIALIST_REVIEW','IN_SPECIALIST_REVIEW'].includes(i.status)).length;
  const client=state.issues.filter(i=>i.status==='CLIENT_DECISION').length;
  return `${liveError?`<div class="notice" role="alert"><h3>Live drafting unavailable</h3><p>${esc(liveError)}</p></div>`:''}<div class="metrics"><div class="metric"><strong>${state.issues.length}</strong><span>Actual source issues</span></div><div class="metric"><strong class="green">${prepared} / ${state.issues.length}</strong><span>Prepared for review</span></div><div class="metric"><strong class="orange">${specialist}</strong><span>Specialist responses needed</span></div><div class="metric"><strong class="red">${client}</strong><span>Client instructions needed</span></div></div><div class="section-head"><h2>Contract negotiation overview</h2></div>
  <div class="cards">${state.issues.map((issue,n)=>`<button class="issue-card" data-action="detail" data-id="${issue.id}"><div class="card-top"><span class="issue-number">${n+1} / ${esc(issue.requiredReviewer||'COUNSEL')}</span>${badge(issue)}</div><h3>${esc(issue.title)}</h3><p>${esc(issue.reason)}</p><div class="card-footer"><span>${esc(issue.sourceDocument)} ${esc(issue.sourceVersion)}</span><span>Open issue ↗</span></div></button>`).join('')}</div>
  <div class="actions">${button('Prepare Client Review Pack','prepare-pack',canPreparePack(state)?'':'disabled','primary')}${canDraft(state)?button('Generate Final Drafts','generate-drafts',busy?'disabled':'') : ''}</div><p class="hint">These issues come from the imported Legora text. Source quotes need verification against the original documents. Complete the required recorded responses and instructions to unlock whole-package review.</p>`;
}

function evidence(label, text, source = '') {
  return `<div class="evidence"><div class="eyebrow">${esc(label)}</div><p class="quote">${esc(text)}</p>${source ? `<span class="hint">${esc(source)}</span>` : ''}</div>`;
}

function detailView() {
  const issue = state.issues.find(i => i.id === selectedIssue);
  if(isLive()) return liveDetailView(issue);
  return `${issue.stale ? versionWarning() : ''}<div class="section-head"><h2>${esc(issue.title)}</h2>${badge(issue)}</div><div class="detail-grid">
    <section class="panel">${evidence('Investor request · ' + issue.sourceVersion, issue.investorRequest, issue.sourceDocument)}${evidence('LPA baseline', issue.lpaPosition, issue.lpaSource)}
      ${issue.precedents.map(p => `<div class="evidence"><div class="eyebrow">Executed precedent from another investor · synthetic</div><p class="quote">${esc(p.text)}</p><div class="tags"><span class="tag">${esc(p.investor)}</span><span class="tag">${esc(p.fund)}</span><span class="tag">${esc(p.commitment)} · ${esc(p.investorType)}</span><span class="tag">${p.status}</span></div><p class="hint">${esc(p.sourceDocument)}</p>${evidence('Applicability / commitment context',p.applicability)}</div>`).join('')}
      <p class="source-note">${esc(fixtures['demo-case'].sourceNote)}</p></section>
    <aside class="panel">${evidence('Why this next step',issue.reason)}${evidence('Suggested action',issue.nextAction)}
      ${issue.id === 'poa' ? poaActions(issue) : issue.id === 'public-records' ? precedentActions(issue) : issue.id === 'tax' ? taxActions(issue) : clientActions(issue)}
      <p class="hint">Decision scope: ${esc(state.matter.fund)} / ${esc(state.matter.investor)} / ${esc(issue.sourceDocument)} ${esc(issue.sourceVersion)}</p></aside></div>`;
}

function liveForm(issue,key,label,multiline=false) {
  return `<label for="form-${issue}-${key}">${label}</label>${multiline?`<textarea id="form-${issue}-${key}" data-form-issue="${issue}" data-form-key="${key}" maxlength="6000"></textarea>`:`<input id="form-${issue}-${key}" data-form-issue="${issue}" data-form-key="${key}" maxlength="200">`}`;
}
function liveDetailView(issue) {
  let actions='';
  if(issue.status==='READY') actions=issue.draftPrepared?`<div class="success"><strong>Draft response prepared for lawyer review</strong><p>${esc(issue.draftResponse)}</p></div>`:button('Draft Response','live-prepare-response',`data-id="${issue.id}"`,'primary');
  if(issue.status==='PRECEDENT')actions=button('Use as Proposed Starting Position','live-propose-precedent',`data-id="${issue.id}"`,'primary');
  if(issue.status==='PROPOSED_FROM_PRECEDENT')actions=`<div class="success">Proposed starting position: ${esc(issue.proposedPosition)}</div>`;
  if(issue.status==='SPECIALIST_REVIEW')actions=button('Prepare Specialist Review Packet','live-prepare-specialist',`data-id="${issue.id}"`,'primary');
  if(issue.status==='IN_SPECIALIST_REVIEW')actions=`<div class="success"><strong>${esc(issue.requiredReviewer)} review packet · ${esc(issue.sourceVersion)}</strong><p>${esc(issue.specialistQuestion)}</p><p class="hint">Sources: quoted request, LPA position and any supplied precedent. Copy/send through your normal tools; nothing has been sent automatically.</p></div>${liveForm(issue.id,'actor','Specialist reviewer name')}${liveForm(issue.id,'response','Paste the actual specialist response / drafting instruction',true)}${button('Record Specialist Response','live-record-specialist',`data-id="${issue.id}"`,'primary')}`;
  if(issue.status==='CLIENT_DECISION')actions=`${liveForm(issue.id,'actor','Client / partner giving the instruction')}${liveForm(issue.id,'instruction','Record the actual client instruction for this wording and version',true)}${button('Record Client Instruction','live-record-instruction',`data-id="${issue.id}"`,'primary')}`;
  if(['SPECIALIST_REVIEWED','CLIENT_APPROVED'].includes(issue.status))actions=`<div class="success"><strong>Recorded position · ${esc(issue.sourceVersion)}</strong><p>${esc(issue.proposedPosition)}</p><p class="hint">Recorded by the local user. Reviewer/client identity is not independently verified.</p></div>`;
  return `<div class="section-head"><h2>${esc(issue.title)}</h2>${badge(issue)}</div><div class="detail-grid"><section class="panel">${evidence('Quoted request / clause from Legora',issue.requestQuote,issue.sourceDocument+' '+issue.sourceVersion)}${evidence('Request summary',issue.investorRequest)}${evidence('LPA baseline',issue.lpaPosition)}${issue.lpaQuote?evidence('Exact LPA source quote',issue.lpaQuote):''}${issue.precedents.map(p=>evidence('Supplied historical wording · '+p.status,p.text,p.applicability)).join('')}<p class="source-note">Quoted from your imported Legora analysis. Check document names, section/page references and quotations against the original contract.</p></section><aside class="panel">${evidence('Why this next step',issue.reason)}${evidence('Suggested action',issue.nextAction)}${actions}<div class="warning">Precedent is evidence, not authority. Model output cannot record human approval.</div></aside></div>`;
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
  if(isLive())return livePackView();
  const approved = canDraft(state);
  return `<div class="eyebrow">Whole product / ${esc(state.matter.currentVersion)}</div><h2>Client Review Pack</h2><p class="sub">The client sees every issue and the three linked work products, including points that did not need a separate client question.</p>
    <section class="panel" style="margin-top:20px">${state.issues.map(issue => `<div class="pack-row"><div><h3>${esc(issue.title)}</h3><p>${issue.id === 'poa' ? 'Draft confirmation prepared · ready for final lawyer review' : issue.id === 'public-records' ? 'Proposed from executed precedent; applicability remains for counsel to verify' : issue.id === 'tax' ? 'Tax reviewed for ' + esc(issue.specialistReview?.sourceVersion) + (state.matter.currentVersion === 'v4' ? ' · unchanged clause in v4' : '') : 'Client instruction: ' + esc(issue.proposedPosition)}</p></div>${badge(issue)}</div>`).join('')}
      <div class="warning">Sign-off covers the current package scope/version. All final wording still goes to the lawyer for review. No approval creates an executed precedent.</div>
      ${approved ? `<div class="success"><strong>Client package approved · ${esc(state.package.packageVersion)}</strong><p class="hint">Approved by Client (simulated). Instruction and Tax response are shared across all drafting products.</p></div><div class="actions">${button(busy ? 'Drafting…' : 'Generate Final Drafts','generate-drafts',busy ? 'disabled' : '', 'primary')}</div>` : state.package?.status === 'RETURNED_TO_LAWYER' ? `<div class="warning">Package returned to the lawyer. Recheck the work and prepare the pack again.</div>${button('Return to overview','overview','','primary')}` : `<div class="actions">${button('Approve Package','approve-package','','primary')}${button('Return to Lawyer','return-lawyer','','ghost')}</div>`}
    </section>`;
}

function livePackView() {
  const approved=canDraft(state);
  return `<div class="eyebrow">Whole actual-source review / ${esc(state.matter.currentVersion)}</div><h2>Client Review Pack</h2><p class="sub">Review every issue and record sign-off obtained through your normal client process.</p><section class="panel" style="margin-top:20px">${state.issues.map(issue=>`<div class="pack-row"><div><h3>${esc(issue.title)}</h3><p>${esc(issue.proposedPosition||issue.draftResponse)}</p></div>${badge(issue)}</div>`).join('')}<div class="warning">This records an instruction/sign-off you have obtained. It does not contact the client or independently verify their identity. Final wording still requires lawyer review.</div>${approved?`<div class="success">Client package sign-off recorded for ${esc(state.package.packageVersion)} by ${esc(state.package.approvedBy)}.</div>${button(busy?'Drafting…':'Generate Final Drafts','generate-drafts',busy?'disabled':'','primary')}`:state.package?.status==='RETURNED_TO_LAWYER'?'<p>Returned to lawyer. Prepare the pack again after checking the work.</p>':`${liveForm('package','actor','Name of the client / partner who signed off this package')}<div class="actions">${button('Record Client Package Sign-off','approve-package','','primary')}${button('Return to Lawyer','return-lawyer','','ghost')}</div>`}${liveError?`<div class="notice" role="alert"><p>${esc(liveError)}</p></div>`:''}</section>`;
}

function draftsView() {
  if (!state.drafts || !canDraft(state)) return overviewView();
  const labels = { draftEmail:'Draft Email', commentsMemo:'Comments Memo', sideLetterChanges:'Side Letter Changes' };
  const copies = { draftEmail:'Copy Draft Email', commentsMemo:'Copy Comments Memo', sideLetterChanges:'Copy Side Letter Changes' };
  return `<div class="eyebrow">Three linked work products / ${esc(state.matter.currentVersion)}</div><h2>Aligned drafts. Recorded positions preserved.</h2><p class="sub">${isLive()?'Actual imported source; recorded instructions/responses are kept identical across all three products.':'Client instruction: '+esc(DECISIONS[state.issues.find(i => i.id === 'advisory-council').humanDecision.decision])}</p>
    <section class="panel" style="margin-top:20px"><div class="tabs" role="tablist" aria-label="Draft products">${Object.entries(labels).map(([key,label]) => button(label,'draft-tab',`role="tab" aria-selected="${draftTab===key}" data-tab="${key}"`,'ghost')).join('')}</div>
      <div class="draft" role="tabpanel" aria-label="${labels[draftTab]}">${esc(state.drafts[draftTab])}</div><div class="actions">${button(copies[draftTab],'copy-draft',`data-tab="${draftTab}"`,'primary')}${button('Copy Full Review Package','copy-full','','ghost')}</div>
      <p class="hint">Paste email into Outlook if desired. Paste the memo / Side Letter changes into Legora or Word for final lawyer review. Transfers are manual.</p>
      ${clipboardFallback ? `<div class="copy-manual"><label for="manual-copy">Clipboard unavailable — select this text and press Ctrl+C</label><textarea id="manual-copy" readonly>${esc(clipboardFallback)}</textarea></div>` : ''}</section>
    <div class="actions">${!isLive()?button('Simulate Investor v4','activate-v4',state.matter.currentVersion==='v4' ? 'disabled' : '', 'ghost'):''}${button('Client Review Pack','open-pack','','ghost')}</div>`;
}

function auditView() {
  return `<details class="audit"><summary>Decision trail · ${state.audit.length} events · exact source/version scope</summary>${state.audit.map(event => `<div class="audit-row"><b>${esc(event.approvalType.replaceAll('_',' '))}</b> · ${esc(event.issue)} · ${esc(event.approvedBy)} (${isLive()?'user-recorded; identity unverified':'simulated'})<br>${esc(event.fund)} / ${esc(event.investor)} / ${esc(event.sourceDocument)} ${esc(event.sourceVersion)}${event.decision ? '<br>Instruction: ' + esc(DECISIONS[event.decision]) : ''}${event.instruction?'<br>Instruction: '+esc(event.instruction):''}</div>`).join('')}</details>`;
}

async function api(path, body) {
  const response = await fetch(`${endpoint}${path}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body), signal:AbortSignal.timeout(18000) });
  const result=await response.json();
  if (!response.ok) throw new Error(result.error || 'Backend unavailable');
  return result;
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('Copied. Paste into your normal tools for lawyer review.'); }
  catch { clipboardFallback = text; render(); document.querySelector('#manual-copy')?.select(); toast('Select the displayed text and press Ctrl+C.'); }
}
root.addEventListener('input', event => {
  if (event.target.id === 'context') intakeText = event.target.value;
  if(event.target.dataset.matter)liveMatterForm[event.target.dataset.matter]=event.target.value;
  if(event.target.dataset.formKey) { const id=event.target.dataset.formIssue;liveInputs[id]||={};liveInputs[id][event.target.dataset.formKey]=event.target.value; }
});
root.addEventListener('click', async event => {
  const el = event.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const action = el.dataset.action;
  try {
    if (action === 'back') { if (busy) return; const previous=viewHistory.pop(); if (previous) { view=previous.view; selectedIssue=previous.selectedIssue; draftTab=previous.draftTab; navigatingBack=true; render(); } return; }
    if (action === 'intake') { if (busy) return; view='import'; render(); return; }
    if (action === 'reset') { if (busy) return; state=isLive()?createLiveState():createState(); if(isLive())liveMatterForm=structuredClone(state.matter); intakeText=state.context; liveError=''; liveInputs={}; view='import'; viewHistory=[]; lastRenderedPage=null; clipboardFallback=''; render(); return; }
    if(action==='switch-mode') { if(busy)return; if(isLive()){liveSnapshot=state;liveIntake=intakeText;}else{demoSnapshot=state;demoIntake=intakeText;}state=el.dataset.mode==='live'?liveSnapshot:demoSnapshot;intakeText=isLive()?liveIntake:demoIntake;view='import';viewHistory=[];lastRenderedPage=null;liveError='';render();return; }
    if(action==='copy-legora-prompt') { await copy(LEGORA_REVIEW_PROMPT);return; }
    if(action==='paste-clipboard') { try { intakeText=(await navigator.clipboard.readText()).slice(0,24000);render();toast('Clipboard text pasted.'); } catch { toast('Use Ctrl+V in the analysis text box.'); } return; }
    if (action === 'load-demo') { intakeText=fixtures['demo-case'].legoraContext; render(); toast('Synthetic Atlas context loaded.'); return; }
    if (action === 'import-selection') {
      if (!extensionMode) { toast('Use the Chrome side panel for selection import, or paste the copied Legora analysis below.'); return; }
      const result = await chrome.runtime.sendMessage({type:'IMPORT_SELECTION'});
      if (result?.text) { intakeText=result.text; render(); toast('Selected text imported.'); }
      else toast(result?.message || 'No text selected. Select in Legora or paste it manually.');
      return;
    }
    if (action === 'analyze') {
      if (busy) return;
      let candidate={...state,context:intakeText};
      if(isLive()) { candidate.matter=validateMatter(liveMatterForm);if(intakeText.trim().length<40)throw new Error('Paste Legora analysis with source quotes first.'); }
      busy=true; render();
      let succeeded=false;
      try { const result=await api('/api/analyze',{legoraContext:candidate.context,matter:candidate.matter,mode:isLive()?'live':'demo'});state=isLive()?applyLiveAnalysis(candidate,result):applyAnalysis(candidate,result);succeeded=true;liveError=''; }
      catch(error) { if(isLive())liveError=error.message || 'Live Mistral unavailable; source text preserved.';else { state=applyAnalysis(candidate,null);succeeded=true; } }
      finally { busy=false; }
      if(succeeded) { viewHistory=[]; lastRenderedPage={view:'import',selectedIssue:state.issues[0].id,draftTab}; selectedIssue=state.issues[0].id; view='overview'; liveInputs={}; clipboardFallback=''; } render(); return;
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
      let succeeded=false;
      try {
        const result=await api('/api/draft',{state});
        if (!['draftEmail','commentsMemo','sideLetterChanges'].every(key => typeof result[key]==='string' && result[key].length>30)) throw new Error('Invalid drafts');
        state.drafts=result; state.provenance=result.provenance || 'Demo-safe fallback'; succeeded=true;
      } catch(error) { if(isLive())liveError=error.message||'Live drafting unavailable; recorded decisions preserved.';else { state.drafts=composeDrafts(state); state.provenance='Demo-safe fallback'; succeeded=true; } }
      finally { busy=false; }
      if(succeeded) { view='drafts';draftTab='draftEmail';clipboardFallback='';liveError=''; } render(); return;
    }
    const transitions = { 'prepare-poa':'PREPARE_POA','propose-precedent':'PROPOSE_PRECEDENT','send-tax':'SEND_TAX','tax-reply':'TAX_REPLY','client-decision':'CLIENT_DECISION','prepare-pack':'PREPARE_PACK','approve-package':'APPROVE_PACKAGE','return-lawyer':'RETURN_TO_LAWYER','activate-v4':'ACTIVATE_V4','live-prepare-response':'PREPARE_RESPONSE','live-propose-precedent':'PROPOSE_PRECEDENT','live-prepare-specialist':'PREPARE_SPECIALIST','live-record-specialist':'RECORD_SPECIALIST','live-record-instruction':'RECORD_INSTRUCTION' };
    if (transitions[action]) {
      state=transition(state,transitions[action],{id:el.dataset.id,decision:el.dataset.decision,...(liveInputs[el.dataset.id||'package']||{})});
      liveError='';
      if (action==='prepare-pack') view='pack';
      if (action==='activate-v4') { view='overview'; clipboardFallback=''; }
      render();
      const messages={'send-tax':'Tax packet prepared. Continue the other issues in parallel.','tax-reply':'Simulated Tax review recorded for the exact v3 clause.','client-decision':'Client instruction recorded for the current source version.','approve-package':'Simulated client package sign-off recorded.','activate-v4':'Only the Advisory Council issue reopened. Old drafts and package sign-off were invalidated.'};
      if(isLive())toast('Current source-scoped workflow record updated.');else if (messages[action]) toast(messages[action]);
    }
  } catch(error) { toast(error.message || 'Complete the current workflow step first.'); }
});
render();
