import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, applyAnalysis, transition, canPreparePack, canDraft, composeDrafts, validateAnalysis, validateDraftState } from '../extension/workflow.js';
import { validateDraftSections, completeJson } from '../server/mistral.js';

function resolvedState(decision = 'OBSERVER_RIGHTS_ONLY') {
  let state=applyAnalysis(createState(),null);
  for (const [action,id,extra] of [['PREPARE_POA','poa'],['PROPOSE_PRECEDENT','public-records'],['SEND_TAX','tax'],['TAX_REPLY','tax'],['CLIENT_DECISION','advisory-council',{decision}]]) state=transition(state,action,{id,...extra});
  state=transition(state,'PREPARE_PACK');
  return transition(state,'APPROVE_PACKAGE');
}

test('four initial routes; READY and precedent never become approvals', () => {
  let state=applyAnalysis(createState(),null);
  assert.deepEqual(state.issues.map(i=>i.status),['READY','PRECEDENT','SPECIALIST_REVIEW','CLIENT_DECISION']);
  state=transition(state,'PREPARE_POA',{id:'poa'});
  state=transition(state,'PROPOSE_PRECEDENT',{id:'public-records'});
  assert.equal(state.issues[0].status,'READY');
  assert.equal(state.issues[1].status,'PROPOSED_FROM_PRECEDENT');
  assert.equal(state.issues[1].approvedBy,undefined);
  assert.equal(canPreparePack(state),false);
  assert.throws(()=>transition(state,'APPROVE_PACKAGE'));
});
test('Tax packet and reply are scoped, simulated and run independently', () => {
  let state=applyAnalysis(createState(),null);
  state=transition(state,'SEND_TAX',{id:'tax'});
  state=transition(state,'PREPARE_POA',{id:'poa'});
  state=transition(state,'TAX_REPLY',{id:'tax'});
  const review=state.issues[2].specialistReview;
  assert.equal(review.sourceVersion,'v3'); assert.equal(review.reviewedBy,'Tax');
  assert.equal(review.fund,state.matter.fund); assert.equal(review.investor,state.matter.investor);
  assert.equal(state.issues[2].status,'SPECIALIST_REVIEWED');
  assert.equal(state.issues[3].status,'CLIENT_DECISION');
});
test('all human choices appear consistently in three final products', () => {
  for (const decision of ['OBSERVER_RIGHTS_ONLY','REJECT','ACCEPT_NOMINATION']) {
    const state=resolvedState(decision); const drafts=composeDrafts(state);
    assert.equal(canDraft(state),true); assert.equal(state.package.packageVersion,'v3');
    const match={OBSERVER_RIGHTS_ONLY:/Observer \/ information rights only/,REJECT:/Reject the requested Advisory Council/,ACCEPT_NOMINATION:/may nominate one representative/}[decision];
    for (const text of Object.values(drafts)) assert.match(text,match);
    assert.equal(state.issues[3].humanDecision.approvedBy,'Client');
  }
});
test('v4 invalidates only dependent governance; old drafts and package cannot be reused', () => {
  const original=resolvedState(); original.drafts=composeDrafts(original);
  let state=transition(original,'ACTIVATE_V4');
  assert.equal(state.issues[3].status,'CLIENT_DECISION'); assert.equal(state.issues[3].stale,true);
  assert.equal(state.issues[3].previousDecision.sourceVersion,'v3');
  assert.deepEqual(state.issues.slice(0,3),original.issues.slice(0,3));
  assert.equal(state.issues[2].specialistReview.sourceVersion,'v3');
  assert.equal(state.drafts,null); assert.equal(state.package,null); assert.equal(canDraft(state),false);
  assert.throws(()=>composeDrafts(state));
  state=transition(state,'CLIENT_DECISION',{id:'advisory-council',decision:'REJECT'});
  state=transition(state,'PREPARE_PACK'); state=transition(state,'APPROVE_PACKAGE');
  assert.equal(state.package.packageVersion,'v4'); assert.equal(canDraft(state),true);
  assert.match(composeDrafts(state).commentsMemo,/unchanged in v4/);
});
test('model cannot set human authority, inject state fields or add duplicate issues', () => {
  const raw={issues:createState().issues.map(({id,status,reason})=>({id,status,reason}))};
  assert.equal(validateAnalysis(raw).length,4);
  for (const unsafe of ['APPROVED','CLIENT_APPROVED','SIGNED','EXECUTED','BINDING','SPECIALIST_APPROVED']) {
    const attempt=structuredClone(raw); attempt.issues[0].status=unsafe;
    assert.throws(()=>validateAnalysis(attempt));
  }
  const injected=structuredClone(raw); injected.issues[3].approvedBy='Client';
  assert.throws(()=>validateAnalysis(injected));
  const duplicate=structuredClone(raw); duplicate.issues[3]=duplicate.issues[0];
  assert.throws(()=>validateAnalysis(duplicate));
});
test('drafting rejects changed or mismatched source scope and incomplete review', () => {
  for (const mutate of [s=>s.issues[3].humanDecision.sourceVersion='v2',s=>s.issues[2].investorRequest='Different Tax request',s=>s.package.investor='Another investor',s=>s.issues[3].humanDecision.fund='Another fund',s=>s.issues[3].stale=true]) {
    const state=resolvedState(); mutate(state); assert.throws(()=>validateDraftState(state));
  }
});
test('returned client package cannot draft until prepared and signed off again', () => {
  let state=resolvedState(); state.package.status='AWAITING_CLIENT';
  state=transition(state,'RETURN_TO_LAWYER'); assert.equal(canDraft(state),false);
  state=transition(state,'PREPARE_PACK'); state=transition(state,'APPROVE_PACKAGE'); assert.equal(canDraft(state),true);
});
test('Mistral drafting cannot contradict or write the governance instruction', () => {
  const raw={sections:['poa','public-records','tax'].map(id=>({id,draftEmail:'Proposed text for lawyer review.',commentsMemo:'Proposed text for lawyer review.',sideLetterChanges:'Proposed text for lawyer review.'}))};
  assert.equal(Object.keys(validateDraftSections(raw)).length,3);
  raw.sections[0].draftEmail='Atlas receives a voting appointment right.';
  assert.throws(()=>validateDraftSections(raw));
});
test('Mistral transport uses JSON mode; invalid and network responses fail to fallback', async () => {
  let captured;
  const fake=async(url,request)=>{captured={url,request};return {ok:true,json:async()=>({choices:[{message:{content:'{"issues":[]}'}}]})};};
  const result=await completeJson([{role:'user',content:'test'}],{apiKey:'test-only',fetchImpl:fake});
  assert.deepEqual(result,{issues:[]});
  assert.equal(captured.url,'https://api.mistral.ai/v1/chat/completions');
  assert.equal(JSON.parse(captured.request.body).response_format.type,'json_object');
  await assert.rejects(completeJson([],{apiKey:'test-only',fetchImpl:async()=>{throw new Error('offline');}}));
  await assert.rejects(completeJson([],{apiKey:'test-only',fetchImpl:async()=>({ok:true,json:async()=>({choices:[{message:{content:'not json'}}]})})}));
});
