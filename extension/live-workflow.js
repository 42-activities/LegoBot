import { INITIAL_STATUSES } from './workflow.js';

const text = (value, name, max = 6000) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`Invalid ${name}`);
  return value.trim();
};
export function createLiveState() {
  return {
    mode:'live', matter:{fund:'',investor:'',investorType:'Not specified',commitment:'Not specified',sourceDocument:'',sourceVersion:'v1',currentVersion:'v1'},
    context:'', issues:[], audit:[], package:null, drafts:null, analyzed:false, provenance:'Live analysis · not run'
  };
}
export function validateMatter(matter) {
  const out={};
  for(const key of ['fund','investor','sourceDocument','sourceVersion']) out[key]=text(matter?.[key],key,200);
  out.currentVersion=out.sourceVersion;
  out.investorType=String(matter.investorType||'Not specified').slice(0,200);
  out.commitment=String(matter.commitment||'Not specified').slice(0,100);
  return out;
}
export function validateLiveAnalysis(raw, context, matter) {
  validateMatter(matter);
  if(typeof context!=='string' || context.trim().length<40 || context.length>24000) throw new Error('Paste at least 40 characters of Legora analysis, up to 24000.');
  if(!raw || !Array.isArray(raw.issues) || !raw.issues.length || raw.issues.length>12) throw new Error('Expected 1 to 12 issues grounded in the imported analysis.');
  const allowed=new Set(['title','investorRequest','requestQuote','lpaPosition','lpaQuote','precedentQuote','status','reason','requiredReviewer','specialistQuestion','nextAction','draftResponse']);
  return raw.issues.map((item,index)=>{
    if(Object.keys(item).some(key=>!allowed.has(key)) || !INITIAL_STATUSES.includes(item.status)) throw new Error('Model attempted to set unsupported authority or workflow fields.');
    const requestQuote=text(item.requestQuote,'request source quote',3000);
    if(!context.includes(requestQuote)) throw new Error('A request quote was not found in the imported Legora text.');
    const lpaQuote=String(item.lpaQuote||'').trim();
    const precedentQuote=String(item.precedentQuote||'').trim();
    for(const quote of [lpaQuote,precedentQuote]) if(quote && !context.includes(quote)) throw new Error('A source quote was not found in the imported Legora text.');
    let status=item.status;
    let caution='';
    if(status==='READY' && !lpaQuote) { status='CLIENT_DECISION'; caution=' No quoted LPA support was supplied; counsel must obtain an instruction or further evidence.'; }
    if(status==='PRECEDENT' && (!precedentQuote || !/\b(?:executed|signed|countersigned)\b/i.test(precedentQuote) || /\b(?:not|unsigned|draft|sample|proposed)\b/i.test(precedentQuote))) {
      status='CLIENT_DECISION'; caution=' No clearly executed precedent is established by the quoted source. A sample or draft is informative only.';
    }
    return {
      id:`live-${index+1}`, title:text(item.title,'issue title',160),
      investorRequest:text(item.investorRequest,'investor request'),requestQuote,
      lpaPosition:text(item.lpaPosition,'LPA position'),lpaQuote,
      lpaSource:'Quoted / summarized from imported Legora analysis; verify against the original contract',
      precedents:precedentQuote?[{text:precedentQuote,status:status==='PRECEDENT'?'EXECUTED':'INFORMATIVE',sourceDocument:'Imported Legora analysis',applicability:'Only the source text supplied is available. Verify execution, scope, fund, investor and commitment applicability.'}]:[],
      status,initialStatus:status,reason:text(item.reason,'routing reason')+caution,
      requiredReviewer:status==='SPECIALIST_REVIEW'?text(item.requiredReviewer||'Specialist','reviewer',120):status==='CLIENT_DECISION'?'Client':null,
      specialistQuestion:String(item.specialistQuestion||'Please review the current request and advise on the proposed position.').slice(0,3000),
      nextAction:String(item.nextAction||'Review the quoted evidence and resolve the next action.').slice(0,3000),
      draftResponse:String(item.draftResponse||'Position to be drafted after lawyer review.').slice(0,6000),
      sourceDocument:matter.sourceDocument,sourceVersion:matter.sourceVersion,stale:false
    };
  });
}
export function applyLiveAnalysis(state, result) {
  if(result?.provenance!=='Mistral' || result.mode!=='live') throw new Error('Live results require a successful Mistral response. Demo substitution is disabled.');
  const matter=validateMatter(state.matter);
  // The server sends normalized issues; independently validate original model data.
  const issues=validateLiveAnalysis(result.analysis,state.context,matter);
  return {...createLiveState(),matter,context:state.context,issues,analyzed:true,provenance:'Mistral · live'};
}
function record(state,issue,approvalType,actor,extra={}) {
  const event={id:state.audit.length+1,at:new Date().toISOString(),fund:state.matter.fund,investor:state.matter.investor,
    issue:issue?.id||'whole-package',sourceDocument:state.matter.sourceDocument,sourceVersion:state.matter.currentVersion,
    approvalType,approvedBy:text(actor,'recorded actor',200),simulated:false,recordedBy:'Local user; identity not verified',
    ...(issue?{clause:issue.investorRequest}:{}),...extra};
  state.audit.push(event);return event;
}
export function canPrepareLivePack(state) {
  return state.mode==='live' && state.analyzed && state.issues.length>0 && state.issues.every(i=>!i.stale&&(
    (i.status==='READY'&&i.draftPrepared)||['PROPOSED_FROM_PRECEDENT','SPECIALIST_REVIEWED','CLIENT_APPROVED'].includes(i.status)
  ));
}
export function canDraftLive(state) {
  return canPrepareLivePack(state)&&state.package?.status==='CLIENT_PACKAGE_APPROVED'&&state.package.packageVersion===state.matter.currentVersion;
}
export function transitionLive(input,action,payload={}) {
  const state=structuredClone(input);const issue=state.issues.find(i=>i.id===payload.id);
  const requireIssue=status=>{if(!issue||issue.status!==status)throw new Error('This action is unavailable for the current issue.');};
  switch(action) {
    case 'PREPARE_RESPONSE': requireIssue('READY');issue.draftPrepared=true;record(state,issue,'DRAFT_PREPARED','Lawyer');break;
    case 'PROPOSE_PRECEDENT': requireIssue('PRECEDENT');issue.status='PROPOSED_FROM_PRECEDENT';issue.proposedPosition=issue.draftResponse;record(state,issue,'PROPOSED_STARTING_POSITION','Lawyer');break;
    case 'PREPARE_SPECIALIST':
      requireIssue('SPECIALIST_REVIEW');issue.status='IN_SPECIALIST_REVIEW';
      issue.specialistReview={specialist:issue.requiredReviewer,question:issue.specialistQuestion,sourceDocument:issue.sourceDocument,sourceVersion:issue.sourceVersion,clause:issue.investorRequest,fund:state.matter.fund,investor:state.matter.investor};
      record(state,issue,'SPECIALIST_PACKET_PREPARED','Lawyer');break;
    case 'RECORD_SPECIALIST':
      requireIssue('IN_SPECIALIST_REVIEW');issue.status='SPECIALIST_REVIEWED';
      const response=text(payload.response,'specialist response');
      Object.assign(issue.specialistReview,{response,reviewedBy:text(payload.actor,'reviewer name',200),status:'SPECIALIST_REVIEWED'});
      issue.proposedPosition=response;record(state,issue,'SPECIALIST_RESPONSE_RECORDED',payload.actor,{response,reviewedBy:payload.actor});break;
    case 'RECORD_INSTRUCTION':
      requireIssue('CLIENT_DECISION');const instruction=text(payload.instruction,'client instruction');
      issue.humanDecision=record(state,issue,'CLIENT_INSTRUCTION_RECORDED',payload.actor,{instruction});
      issue.proposedPosition=instruction;issue.status='CLIENT_APPROVED';issue.stale=false;break;
    case 'PREPARE_PACK':
      if(!canPrepareLivePack(state))throw new Error('Prepare all issues and record the required responses/instructions first.');
      state.package={status:'AWAITING_CLIENT',packageVersion:state.matter.currentVersion};record(state,null,'PACKAGE_PREPARED','Lawyer');break;
    case 'APPROVE_PACKAGE':
      if(!canPrepareLivePack(state)||state.package?.status!=='AWAITING_CLIENT')throw new Error('Prepare the current review pack first.');
      state.package={...record(state,null,'CLIENT_PACKAGE_SIGNOFF_RECORDED',payload.actor),status:'CLIENT_PACKAGE_APPROVED',packageVersion:state.matter.currentVersion};break;
    case 'RETURN_TO_LAWYER':
      if(state.package?.status!=='AWAITING_CLIENT')throw new Error('Prepare the current review pack first.');
      state.package.status='RETURNED_TO_LAWYER';record(state,null,'PACKAGE_RETURNED',payload.actor||'Client');break;
    default:throw new Error('Unknown live workflow action');
  }
  state.drafts=null;return state;
}
export function validateLiveDraftState(state) {
  if(!canDraftLive(state))throw new Error('The current complete package requires recorded client sign-off.');
  const matter=validateMatter(state.matter);
  for(const key of ['fund','investor','sourceDocument','sourceVersion']) if(state.package[key]!==matter[key]) throw new Error('Package source scope mismatch.');
  if(typeof state.context!=='string'||!state.context.trim()||state.issues.length>12)throw new Error('Missing live source context.');
  const ids=new Set();
  for(const issue of state.issues) {
    if(ids.has(issue.id)||!/^live-\d+$/.test(issue.id))throw new Error('Invalid live issue identifiers.');ids.add(issue.id);
    if(!state.context.includes(issue.requestQuote)||issue.sourceDocument!==matter.sourceDocument||issue.sourceVersion!==matter.sourceVersion)throw new Error('Issue source scope mismatch.');
    if(issue.status==='CLIENT_APPROVED'||issue.status==='SPECIALIST_REVIEWED') {
      const decision=issue.humanDecision||issue.specialistReview;
      if(!decision||decision.clause!==issue.investorRequest||['fund','investor','sourceDocument','sourceVersion'].some(k=>decision[k]!==matter[k]))throw new Error('Recorded response/instruction scope mismatch.');
      const position=decision.instruction||decision.response;
      if(!position||issue.proposedPosition!==position)throw new Error('Recorded position mismatch.');
    }
  }
  return state;
}
export function composeLiveDrafts(state,raw) {
  validateLiveDraftState(state);
  if(!raw||!Array.isArray(raw.sections)||raw.sections.length!==state.issues.length)throw new Error('Invalid live drafting schema.');
  const paragraphs=state.issues.map(issue=>{
    const matches=raw.sections.filter(s=>s.id===issue.id);
    if(matches.length!==1||Object.keys(matches[0]).some(k=>!['id','suggestedWording'].includes(k)))throw new Error('Invalid live draft issue scope.');
    const modelWording=text(matches[0].suggestedWording,'proposed draft wording');
    // Preserve recorded human text exactly in every product. AI cannot replace it.
    const position=issue.humanDecision?.instruction||issue.specialistReview?.response||modelWording;
    return `${issue.title}\n${issue.humanDecision||issue.specialistReview?'Recorded position / drafting instruction':'Mistral proposed wording'}: ${position}\nSource: ${issue.sourceDocument} ${issue.sourceVersion}.`;
  });
  const scope=`${state.matter.fund} / ${state.matter.investor} / ${state.matter.sourceDocument} ${state.matter.currentVersion}`;
  const notice='Proposed work product for final lawyer review. Recorded human identities are not independently verified. No signed or binding document is created.';
  const shared=paragraphs.join('\n\n');
  return {
    draftEmail:`Draft email — ${scope}\n\nDear ${state.matter.investor},\n\nPlease find our proposed issue-by-issue response below, subject to final lawyer review:\n\n${shared}\n\n${notice}`,
    commentsMemo:`Comments memo — ${scope}\n\n${shared}\n\n${notice}`,
    sideLetterChanges:`Suggested wording / drafting instructions — ${scope}\n\n${shared}\n\nCounsel should decide which points belong in the Side Letter rather than only the comments memo.\n\n${notice}`
  };
}
