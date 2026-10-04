import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server/server.js';
import { createLiveState, validateLiveAnalysis, applyLiveAnalysis, transitionLive, canDraftLive, validateLiveDraftState, composeLiveDrafts } from '../extension/live-workflow.js';

// Deliberately invented test text, independent of the bundled Atlas demonstration.
const context='Test Side Letter: Provide quarterly reports. Test LPA: Quarterly reports are provided. Test Side Letter: Review withholding. Test Side Letter: Grant a committee seat. Sample precedent: Signed sample wording.';
const matter={fund:'Test Fund',investor:'Test Investor',sourceDocument:'Test LPA + Side Letter',sourceVersion:'r2'};
const issue=(title,quote,status,extra={})=>({title,investorRequest:quote,requestQuote:quote,lpaPosition:'See the supplied test source.',lpaQuote:'',precedentQuote:'',status,reason:'Test routing explanation.',draftResponse:'Proposed response for counsel.',...extra});
const analysis={issues:[
  issue('Reporting','Provide quarterly reports.','READY',{lpaQuote:'Quarterly reports are provided.'}),
  issue('Withholding','Review withholding.','SPECIALIST_REVIEW',{requiredReviewer:'Tax counsel'}),
  issue('Committee seat','Grant a committee seat.','CLIENT_DECISION')
]};
function analyzed(){return applyLiveAnalysis({...createLiveState(),matter,context},{mode:'live',provenance:'Mistral',analysis});}
function ready(){
  let s=analyzed();
  s=transitionLive(s,'PREPARE_RESPONSE',{id:'live-1'});
  s=transitionLive(s,'PREPARE_SPECIALIST',{id:'live-2'});
  s=transitionLive(s,'RECORD_SPECIALIST',{id:'live-2',actor:'Named specialist',response:'Preserve mandatory withholding. No gross-up.'});
  s=transitionLive(s,'RECORD_INSTRUCTION',{id:'live-3',actor:'Named client',instruction:'Reject a committee seat; provide reports only.'});
  s=transitionLive(s,'PREPARE_PACK');
  return transitionLive(s,'APPROVE_PACKAGE',{actor:'Named client'});
}

test('live analysis uses variable source issues and rejects invented quotes, authority and fallback',()=>{
  const s=analyzed();
  assert.equal(s.issues.length,3);assert.equal(s.issues[0].title,'Reporting');
  assert.equal(s.matter.investor,'Test Investor');assert.equal(s.provenance,'Mistral · live');
  assert.throws(()=>validateLiveAnalysis({issues:[{...analysis.issues[0],requestQuote:'Invented term'}]},context,matter),/quote/);
  assert.throws(()=>validateLiveAnalysis({issues:[{...analysis.issues[0],approvedBy:'AI'}]},context,matter),/authority/);
  assert.throws(()=>validateLiveAnalysis({issues:[{...analysis.issues[0],status:'CLIENT_APPROVED'}]},context,matter),/authority/);
  assert.throws(()=>applyLiveAnalysis({...s},{mode:'live',provenance:'Demo-safe fallback',analysis}),/successful Mistral/);
});

test('missing LPA quotes and sample precedent conservatively require a client instruction',()=>{
  const raw={issues:[issue('Reports','Provide quarterly reports.','READY'),issue('Sample','Grant a committee seat.','PRECEDENT',{precedentQuote:'Signed sample wording.'})]};
  assert.ok(validateLiveAnalysis(raw,context,matter).every(i=>i.status==='CLIENT_DECISION'));
});

test('live workflow requires actual named responses and whole-package sign-off',()=>{
  let s=analyzed();assert.equal(canDraftLive(s),false);
  assert.throws(()=>transitionLive(s,'PREPARE_PACK'),/all issues/);
  assert.throws(()=>transitionLive(s,'RECORD_INSTRUCTION',{id:'live-3',instruction:'Decline.'}),/actor/);
  s=transitionLive(s,'PREPARE_SPECIALIST',{id:'live-2'});
  assert.throws(()=>transitionLive(s,'RECORD_SPECIALIST',{id:'live-2',actor:'Specialist'}),/response/);
  s=ready();assert.equal(canDraftLive(s),true);assert.equal(s.audit.at(-1).simulated,false);
  assert.equal(s.package.approvedBy,'Named client');assert.equal(s.issues[1].specialistReview.sourceVersion,'r2');
  assert.throws(()=>transitionLive(s,'APPROVE_PACKAGE',{actor:'Another person'}),/current review pack/);
});

test('drafts preserve human positions in every product and reject cross-source/tampered decisions',()=>{
  const s=ready();const raw={sections:s.issues.map(i=>({id:i.id,suggestedWording:'Model wording should not replace human instructions.'}))};
  const drafts=composeLiveDrafts(s,raw);
  for(const value of Object.values(drafts)){
    assert.ok(value.includes('Reject a committee seat; provide reports only.'));
    assert.ok(value.includes('Preserve mandatory withholding. No gross-up.'));
    assert.ok(value.includes('Test LPA + Side Letter r2'));
  }
  const mismatched=structuredClone(s);mismatched.issues[2].humanDecision.sourceVersion='r1';
  assert.throws(()=>validateLiveDraftState(mismatched),/scope mismatch/);
  const changed=structuredClone(s);changed.issues[1].proposedPosition='Grant a gross-up.';
  assert.throws(()=>validateLiveDraftState(changed),/position mismatch/);
  const other=structuredClone(s);other.package.investor='Different investor';
  assert.throws(()=>validateLiveDraftState(other),/scope mismatch/);
  const reanalyzed=applyLiveAnalysis(s,{mode:'live',provenance:'Mistral',analysis});
  assert.equal(reanalyzed.package,null);assert.equal(reanalyzed.audit.length,0);assert.equal(canDraftLive(reanalyzed),false);
});

async function withServer(complete,fn){
  const server=createServer({complete});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const post=async(path,data)=>{
    const response=await fetch(origin+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    return {status:response.status,body:await response.json()};
  };
  try{await fn(post);}finally{await new Promise(r=>server.close(r));}
}
test('live API success analyzes supplied source and drafts only after current sign-off',async()=>{
  let calls=0;
  await withServer(async messages=>{
    calls++;assert.ok(messages[1].content.includes(context));
    return calls===1?analysis:{sections:ready().issues.map(i=>({id:i.id,suggestedWording:'Proposed wording for the imported issue.'}))};
  },async post=>{
    const result=await post('/api/analyze',{mode:'live',matter,legoraContext:context});
    assert.equal(result.status,200);assert.equal(result.body.issues.length,3);assert.equal(result.body.provenance,'Mistral');
    assert.equal((await post('/api/draft',{state:analyzed()})).status,409);
    const drafted=await post('/api/draft',{state:ready()});
    assert.equal(drafted.status,200);assert.equal(drafted.body.provenance,'Mistral · live');
    assert.match(drafted.body.sideLetterChanges,/Reject a committee seat/);
  });assert.equal(calls,2);
});
test('live API returns explicit rate-limit failure with no fixture issues or drafts',async()=>{
  await withServer(async()=>{throw new Error('MISTRAL_HTTP_429');},async post=>{
    for(const [path,payload] of [['/api/analyze',{mode:'live',matter,legoraContext:context}],['/api/draft',{state:ready()}]]){
      const result=await post(path,payload);assert.equal(result.status,503);
      assert.equal(result.body.code,'MISTRAL_RATE_LIMIT');assert.match(result.body.error,/429/);
      assert.equal(result.body.issues,undefined);assert.equal(result.body.draftEmail,undefined);
      assert.equal(result.body.provenance,undefined);
    }
  });
});
test('live API rejects missing matter before calling provider and rejects unsupported model evidence',async()=>{
  let calls=0;
  await withServer(async()=>{calls++;return {issues:[{...analysis.issues[0],requestQuote:'Not in the imported text'}]};},async post=>{
    assert.equal((await post('/api/analyze',{mode:'live',legoraContext:context})).status,400);
    const result=await post('/api/analyze',{mode:'live',matter,legoraContext:context});
    assert.equal(result.status,503);assert.equal(result.body.code,'LIVE_UNAVAILABLE');assert.equal(result.body.issues,undefined);
  });assert.equal(calls,1);
});
