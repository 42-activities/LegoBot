import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from '../server/server.js';
import { createState, applyAnalysis, transition } from '../extension/workflow.js';

function readyState() {
  let s=applyAnalysis(createState(),null);
  for (const [action,id,decision] of [['PREPARE_POA','poa'],['PROPOSE_PRECEDENT','public-records'],['SEND_TAX','tax'],['TAX_REPLY','tax'],['CLIENT_DECISION','advisory-council','OBSERVER_RIGHTS_ONLY'],['PREPARE_PACK'],['APPROVE_PACKAGE']]) s=transition(s,action,{id,decision});
  return s;
}
async function withServer(fn,complete=async()=>{throw new Error('Network unavailable');}) {
  const server=createServer({complete});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  try { await fn(origin); } finally { await new Promise(resolve=>server.close(resolve)); }
}
const post=(origin,path,payload)=>fetch(origin+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});

test('health, static app, safe fallback analysis and aligned fallback drafting', async()=>withServer(async origin=>{
  assert.equal((await (await fetch(origin+'/health')).json()).status,'ok');
  const page=await fetch(origin+'/'); assert.equal(page.status,200); assert.match(await page.text(),/LegoNego/);
  assert.equal((await fetch(origin+'/.env.local')).status,404);
  assert.equal((await fetch(origin+'/server/server.js')).status,404);
  const analysis=await (await post(origin,'/api/analyze',{legoraContext:'Manual pasted demo context.'})).json();
  assert.equal(analysis.provenance,'Demo-safe fallback'); assert.equal(analysis.issues.length,4);
  const drafts=await (await post(origin,'/api/draft',{state:readyState()})).json();
  assert.equal(drafts.provenance,'Demo-safe fallback');
  for (const key of ['draftEmail','commentsMemo','sideLetterChanges']) assert.match(drafts[key],/Observer \/ information rights only/);
  assert.equal((await post(origin,'/api/draft',{state:createState()})).status,409);
}));
test('Mistral analysis success is accepted; model approval output falls back',async()=>{
  const safe={issues:createState().issues.map(({id,status,reason,draftResponse})=>({id,status,reason,draftResponse}))};
  await withServer(async origin=>assert.equal((await (await post(origin,'/api/analyze',{legoraContext:'Atlas synthetic context'})).json()).provenance,'Mistral'),async()=>safe);
  safe.issues[0].status='CLIENT_APPROVED';
  await withServer(async origin=>assert.equal((await (await post(origin,'/api/analyze',{legoraContext:'Atlas'})).json()).provenance,'Demo-safe fallback'),async()=>safe);
});
test('CORS blocks unrelated origins and accepts side-panel origin',async()=>withServer(async origin=>{
  assert.equal((await fetch(origin+'/health',{headers:{Origin:'https://unrelated.example'}})).status,403);
  const panel='chrome-extension://'+'a'.repeat(32);
  const response=await fetch(origin+'/health',{headers:{Origin:panel}});
  assert.equal(response.headers.get('Access-Control-Allow-Origin'),panel);
}));
test('MV3 manifest is minimal and each referenced entry point exists',async()=>{
  const root=new URL('../extension/',import.meta.url);
  const manifest=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
  assert.equal(manifest.manifest_version,3);
  assert.deepEqual(manifest.permissions,['sidePanel','activeTab','scripting']);
  assert.ok(manifest.host_permissions.every(host=>/^http:\/\/(localhost|127\.0\.0\.1):8787\/\*$/.test(host)));
  for(const path of [manifest.background.service_worker,manifest.side_panel.default_path,'app.js','workflow.js','demo-data.js']) assert.ok((await readFile(new URL(path,root))).length>0);
});
