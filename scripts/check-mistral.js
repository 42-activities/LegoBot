import { loadLocalEnv } from '../server/server.js';
await loadLocalEnv();
if (!process.env.MISTRAL_API_KEY) { console.log('No local API key configured.'); process.exit(1); }
const headers={'Authorization':`Bearer ${process.env.MISTRAL_API_KEY}`,'Content-Type':'application/json'};
try {
  const response=await fetch('https://api.mistral.ai/v1/chat/completions',{
    method:'POST',headers,signal:AbortSignal.timeout(12000),
    body:JSON.stringify({model:process.env.MISTRAL_MODEL||'mistral-small-latest',max_tokens:32,messages:[{role:'user',content:'Return JSON: {"ok":true}'}],response_format:{type:'json_object'}})
  });
  let details={}; try { details=await response.json(); } catch {}
  const message=String(details.message || details.error?.message || '').replace(/(?:mstrl_|gh[pousr]_)[A-Za-z0-9_-]+|[A-Za-z0-9_-]{30,}/g,'[redacted]').slice(0,240);
  console.log(JSON.stringify({status:response.status,liveResponseReceived:Boolean(details.choices?.[0]?.message?.content),providerMessage:message}));
  if(!response.ok) process.exitCode=1;
} catch(error) { console.log(JSON.stringify({transportError:error.cause?.code||error.name}));process.exitCode=1; }
