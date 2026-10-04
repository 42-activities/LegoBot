// Live provider smoke test: only bundled synthetic matter data is transmitted.
// Credentials, provider bodies and draft text are never logged.
import { createServer, loadLocalEnv } from '../server/server.js';
import { completeJson } from '../server/mistral.js';
import { createState, applyAnalysis, transition } from '../extension/workflow.js';
await loadLocalEnv();
if (!process.env.MISTRAL_API_KEY) { console.log('No local Mistral key configured.'); process.exit(1); }
const transportFailures=[];
const server=createServer({complete:async messages=>{
  try { return await completeJson(messages); }
  catch(error) {
    transportFailures.push(/^MISTRAL_HTTP_\d+$/.test(error.message) ? error.message : (error.cause?.code || error.name || 'Provider error'));
    throw error;
  }
}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const post=async(path,payload)=>(await fetch(origin+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})).json();
try {
  let state=createState();
  const analysis=await post('/api/analyze',{legoraContext:state.context,matter:state.matter});
  state=applyAnalysis(state,analysis);
  for (const [action,id,decision] of [['PREPARE_POA','poa'],['PROPOSE_PRECEDENT','public-records'],['SEND_TAX','tax'],['TAX_REPLY','tax'],['CLIENT_DECISION','advisory-council','OBSERVER_RIGHTS_ONLY'],['PREPARE_PACK'],['APPROVE_PACKAGE']]) state=transition(state,action,{id,decision});
  const drafts=await post('/api/draft',{state});
  const aligned=['draftEmail','commentsMemo','sideLetterChanges'].every(key=>drafts[key]?.includes('Observer / information rights only'));
  console.log(JSON.stringify({analysisProvider:analysis.provenance,draftingProvider:drafts.provenance,issueCount:state.issues.length,threeOutputsAligned:aligned,transportFailures}));
  if (analysis.provenance!=='Mistral' || drafts.provenance!=='Mistral' || !aligned) process.exitCode=1;
} finally { await new Promise(resolve=>server.close(resolve)); }
